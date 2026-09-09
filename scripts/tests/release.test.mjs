import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import test from "node:test"
import { collect, verify } from "../release-artifacts.mjs"
import { assetName, devPublishArgs, digest, publishArgs, targets, verifyBinary, verifyUploadedAssets } from "../lib/release-policy.mjs"

const root = resolve(import.meta.dirname, "../..")
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version
const commit = "a".repeat(40)

function directory(t) {
  const path = mkdtempSync(join(tmpdir(), "uframe-release-test-"))
  t.after(() => rmSync(path, { recursive: true, force: true }))
  return path
}

function binary(id) {
  const bytes = Buffer.alloc(256)
  if (id === "macos-arm64") {
    bytes.writeUInt32LE(0xfeedfacf, 0)
    bytes.writeUInt32LE(0x0100000c, 4)
  } else if (id === "windows-amd64") {
    bytes.write("MZ")
    bytes.writeUInt32LE(128, 0x3c)
    bytes.writeUInt32LE(0x00004550, 128)
    bytes.writeUInt16LE(0x8664, 132)
  } else {
    Buffer.from("7f454c46", "hex").copy(bytes)
    bytes[4] = 2
    bytes[5] = 1
    bytes.writeUInt16LE(id === "linux-amd64" ? 62 : 183, 18)
  }
  return bytes
}

function fixture(t) {
  const path = directory(t)
  const input = join(path, "packages")
  const output = join(path, "verified")
  for (const target of targets) {
    const folder = join(input, target.id)
    mkdirSync(folder, { recursive: true })
    const name = assetName(target, version)
    writeFileSync(join(folder, name), `fixture package ${target.id}`)
    writeFileSync(join(folder, "manifest.json"), JSON.stringify({
      schemaVersion: 1, version, commit, id: target.id, target: target.target, name, ...digest(join(folder, name)),
    }))
  }
  return { path, input, output }
}

test("binary verification accepts only the declared native architecture", () => {
  for (const target of targets) {
    assert.doesNotThrow(() => verifyBinary(binary(target.id), target.id))
    for (const other of targets.filter((item) => item.id !== target.id)) {
      assert.throws(() => verifyBinary(binary(other.id), target.id), /architecture/)
    }
    assert.throws(() => verifyBinary(Buffer.alloc(10), target.id), /architecture/)
  }
  const corrupt = binary("windows-amd64")
  corrupt.writeUInt32LE(0xffffffff, 0x3c)
  assert.throws(() => verifyBinary(corrupt, "windows-amd64"), /architecture/)
})

test("collection rejects missing or ambiguous packages and mismatched executable", (t) => {
  const path = directory(t)
  const bundle = join(path, "bundle")
  mkdirSync(join(bundle, "dmg"), { recursive: true })
  const executable = join(path, "u-frame")
  writeFileSync(executable, binary("macos-arm64"))
  const output = join(path, "out")
  const run = () => collect("macos-arm64", bundle, executable, output, version, commit)
  assert.throws(run, /Exactly one/)
  writeFileSync(join(bundle, "dmg/first.dmg"), "fixture")
  writeFileSync(join(bundle, "dmg/second.dmg"), "fixture")
  assert.throws(run, /Exactly one/)
  rmSync(join(bundle, "dmg/second.dmg"))
  writeFileSync(executable, binary("linux-arm64"))
  assert.throws(run, /architecture/)
  writeFileSync(executable, binary("macos-arm64"))
  run()
  assert.equal(JSON.parse(readFileSync(join(output, "manifest.json"), "utf8")).commit, commit)
  assert.throws(run, /empty/)
})

test("all four verified packages produce checksums and a source-bound manifest", (t) => {
  const f = fixture(t)
  assert.equal(verify(f.input, f.output, version, commit).length, 4)
  const manifest = JSON.parse(readFileSync(join(f.output, "release-manifest.json"), "utf8"))
  assert.equal(manifest.commit, commit)
  assert.equal(manifest.version, version)
  assert.equal(manifest.artifacts.length, 4)
  const sums = readFileSync(join(f.output, "SHA256SUMS"), "utf8").trim().split("\n")
  assert.equal(sums.length, 4)
  for (const record of manifest.artifacts) {
    assert.deepEqual(digest(join(f.output, record.name)), { size: record.size, sha256: record.sha256 })
    assert.ok(sums.includes(`${record.sha256}  ${record.name}`))
  }
  assert.throws(() => verify(f.input, f.output, version, commit), /empty/)
})

test("verification fails closed before output on incomplete, tampered or unexpected artifacts", (t) => {
  const mutations = [
    (f, pkg) => rmSync(pkg),
    (f, pkg) => writeFileSync(pkg, "tampered"),
    (f, pkg) => copyFileSync(pkg, join(f.input, "extra.deb")),
    (f, pkg) => { rmSync(pkg); symlinkSync(join(f.input, "missing"), pkg) },
    (f, _pkg, manifest) => { manifest.commit = "b".repeat(40) },
    (f, _pkg, manifest) => { manifest.name = "../../outside.dmg" },
    (f, _pkg, manifest) => { manifest.id = "linux-amd64" },
    (f, _pkg, manifest) => { manifest.version = "9.0.0" },
    (f, _pkg, manifest) => { manifest.target = "x86_64-apple-darwin" },
  ]
  for (const mutate of mutations) {
    const f = fixture(t)
    const target = targets[0]
    const manifestPath = join(f.input, target.id, "manifest.json")
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
    mutate(f, join(f.input, target.id, manifest.name), manifest)
    writeFileSync(manifestPath, JSON.stringify(manifest))
    assert.throws(() => verify(f.input, f.output, version, commit))
    assert.equal(existsSync(f.output), false)
  }
})

test("only numbered dev tags publish directly; stable and RC remain drafts and never latest", () => {
  const dev = publishArgs("v0.1.0-dev.1", ["package.dmg"], "notes.md")
  assert.ok(dev.includes("--prerelease"))
  assert.ok(dev.includes("--latest=false"))
  assert.ok(dev.includes("--verify-tag"))
  assert.ok(dev.includes("--draft"))
  assert.ok(devPublishArgs("v0.1.0-dev.1").includes("--draft=false"))
  for (const tag of ["v0.1.0", "v0.1.0-rc.1", "v0.1.0-dev.0", "v0.1.0-beta.1"]) {
    assert.ok(publishArgs(tag, [], "notes.md").includes("--draft"))
    assert.equal(devPublishArgs(tag), null)
  }
  for (const tag of ["--latest", "0.1.0", "v0.1.0-dev.01"]) assert.throws(() => publishArgs(tag, [], "notes.md"))
})

test("remote uploads must be complete and hash-identical before dev publication", () => {
  const expected = [{ name: "test.dmg", size: 1, sha256: "a".repeat(64) }]
  const asset = { name: "test.dmg", size: 1, digest: `sha256:${"a".repeat(64)}`, state: "uploaded" }
  assert.doesNotThrow(() => verifyUploadedAssets([asset], expected))
  for (const assets of [[], [asset, asset], [{ ...asset, state: "starter" }], [{ ...asset, digest: null }], [{ ...asset, size: 2 }]]) {
    assert.throws(() => verifyUploadedAssets(assets, expected))
  }
})

test("desktop capability enables exactly the three supported operating systems", () => {
  const capability = JSON.parse(readFileSync(join(root, "src-tauri/capabilities/default.json"), "utf8"))
  assert.deepEqual(capability.platforms, ["macOS", "windows", "linux"])
  assert.deepEqual(capability.permissions, ["core:default"])
})

test("release source rejects lightweight tags, wrong versions and non-main commits", (t) => {
  const path = directory(t)
  writeFileSync(join(path, "git"), `#!/usr/bin/env bash
case "$1" in
  cat-file) printf '%s\\n' "\${TEST_TAG_TYPE:-tag}" ;;
  rev-parse) if [[ "$2" == refs/tags/* ]]; then echo commit; else echo "\${TEST_EVENT_COMMIT:-commit}"; fi ;;
  merge-base) exit "\${TEST_ANCESTOR_EXIT:-0}" ;;
esac
`, { mode: 0o755 })
  const run = (env = {}) => spawnSync("bash", [join(root, "scripts/check-release-source.sh")], {
    encoding: "utf8", env: { ...process.env, PATH: `${path}:${process.env.PATH}`, GITHUB_REF_NAME: `v${version}`, GITHUB_SHA: "commit", ...env },
  })
  assert.equal(run().status, 0)
  for (const env of [{ TEST_TAG_TYPE: "commit" }, { TEST_EVENT_COMMIT: "other" }, { TEST_ANCESTOR_EXIT: "1" }, { GITHUB_REF_NAME: "v9.0.0" }]) {
    assert.notEqual(run(env).status, 0)
  }
})
