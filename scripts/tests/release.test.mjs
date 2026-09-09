import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname, "../..")
const releaseTag = `v${JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version}`
function fixture(t) {
  const path = mkdtempSync(join(tmpdir(), "uframe-release-test-"))
  t.after(() => rmSync(path, { recursive: true, force: true }))
  const bundle = join(path, "bundle with spaces")
  const app = join(bundle, "macos/UFrame.app")
  const dmg = join(bundle, "dmg/UFrame universal.dmg")
  const bin = join(path, "bin")
  mkdirSync(join(app, "Contents/MacOS"), { recursive: true })
  mkdirSync(join(bundle, "dmg"))
  mkdirSync(bin)
  writeFileSync(dmg, "fixture, not an installable DMG")
  writeFileSync(join(app, "Contents/Info.plist"), '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>u-frame</string></dict></plist>')
  writeFileSync(join(app, "Contents/MacOS/u-frame"), "fixture")
  const log = join(path, "calls")
  for (const command of ["lipo", "codesign", "spctl", "xcrun", "gh", "git", "pnpm"]) {
    writeFileSync(join(bin, command), `#!/usr/bin/env bash
set -eu
printf '%s\\n' "${command} $*" >> "$TEST_LOG"
if [[ "${command}" == "${"$"}{TEST_FAIL:-}" ]]; then exit 9; fi
if [[ "${command}" == git ]]; then
  case "$1" in
    cat-file) printf '%s\\n' "${"$"}{TEST_TAG_TYPE:-tag}" ;;
    rev-parse)
      if [[ "$2" == refs/tags/* ]]; then printf '%s\\n' commit
      else printf '%s\\n' "${"$"}{TEST_EVENT_COMMIT:-commit}"; fi ;;
    merge-base) exit "${"$"}{TEST_ANCESTOR_EXIT:-0}" ;;
  esac
fi
`, { mode: 0o755 })
  }
  return {
    path, bundle, app, dmg, log, checksum: join(path, "SHA256SUMS"),
    run(script, args = [], extraEnv = {}) {
      return spawnSync("bash", [resolve(root, "scripts", script), ...args], {
        cwd: root, encoding: "utf8",
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_LOG: log, GH_TOKEN: "fixture-only", GITHUB_REF_NAME: releaseTag, GITHUB_SHA: "commit", ...extraEnv },
      })
    },
  }
}

test("artifact resolver fails closed for missing or ambiguous output", (t) => {
  const f = fixture(t)
  rmSync(f.dmg)
  assert.notEqual(f.run("verify-macos-release.sh", [f.bundle, f.checksum]).status, 0)
  writeFileSync(f.dmg, "fixture")
  copyFileSync(f.dmg, join(f.bundle, "dmg/duplicate.dmg"))
  assert.notEqual(f.run("verify-macos-release.sh", [f.bundle, f.checksum]).status, 0)
  assert.equal(existsSync(f.log), false)
})

test("verifier checks Universal, app and DMG signatures, Gatekeeper and both tickets before checksum", { skip: process.platform !== "darwin" }, (t) => {
  const f = fixture(t)
  const result = f.run("verify-macos-release.sh", [f.bundle, f.checksum])
  assert.equal(result.status, 0, result.stderr)
  const calls = readFileSync(f.log, "utf8").trim().split("\n")
  assert.match(calls[0], /^lipo -verify_arch arm64 x86_64 /)
  assert.match(calls[1], /^codesign .*UFrame.app$/)
  assert.match(calls[2], /^codesign .*UFrame universal.dmg$/)
  assert.match(calls[3], /^spctl --assess /)
  assert.match(calls[4], /^xcrun stapler validate .*UFrame.app$/)
  assert.match(calls[5], /^xcrun stapler validate .*UFrame universal.dmg$/)
  assert.match(readFileSync(f.checksum, "utf8"), /^[a-f0-9]{64} {2}UFrame universal.dmg\n$/)
})

test("any verification failure prevents new checksum generation", { skip: process.platform !== "darwin" }, (t) => {
  const f = fixture(t)
  for (const command of ["lipo", "codesign", "spctl", "xcrun"]) {
    assert.notEqual(f.run("verify-macos-release.sh", [f.bundle, f.checksum], { TEST_FAIL: command }).status, 0)
    assert.equal(existsSync(f.checksum), false)
  }
})

test("publisher binds checksum to exact DMG and only creates a draft", { skip: process.platform !== "darwin" }, (t) => {
  const f = fixture(t)
  assert.equal(f.run("verify-macos-release.sh", [f.bundle, f.checksum]).status, 0)
  assert.equal(f.run("publish-release.sh", [f.bundle, f.checksum]).status, 0)
  assert.match(readFileSync(f.log, "utf8"), /gh release create .*--draft .*--verify-tag/)
  rmSync(f.log)
  writeFileSync(f.dmg, "tampered")
  assert.notEqual(f.run("publish-release.sh", [f.bundle, f.checksum]).status, 0)
  assert.equal(existsSync(f.log), false)
})

test("release source rejects lightweight tags and commits outside main", (t) => {
  const f = fixture(t)
  assert.equal(f.run("check-release-source.sh").status, 0)
  assert.notEqual(f.run("check-release-source.sh", [], { TEST_TAG_TYPE: "commit" }).status, 0)
  assert.notEqual(f.run("check-release-source.sh", [], { TEST_ANCESTOR_EXIT: "1" }).status, 0)
  assert.notEqual(f.run("check-release-source.sh", [], { TEST_EVENT_COMMIT: "different" }).status, 0)
  assert.notEqual(f.run("check-release-source.sh", [], { GITHUB_REF_NAME: "v9.0.0" }).status, 0)
})

test("signing requires every credential before build and never prints their values", (t) => {
  const f = fixture(t)
  const names = ["APPLE_CERTIFICATE", "APPLE_CERTIFICATE_PASSWORD", "APPLE_SIGNING_IDENTITY", "APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID"]
  const values = Object.fromEntries(names.map((name) => [name, "fixture-secret-value"]))
  for (const name of names) {
    const result = f.run("build-signed-release.sh", [], { ...values, [name]: "" })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, new RegExp(name))
    assert.equal((result.stdout + result.stderr).includes("fixture-secret-value"), false)
    assert.equal(existsSync(f.log), false)
  }
  assert.equal(f.run("build-signed-release.sh", [], values).status, 0)
  assert.equal(readFileSync(f.log, "utf8").trim(), "pnpm release:build")
})
