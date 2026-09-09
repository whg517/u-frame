import { createHash } from "node:crypto"
import { readFileSync, readdirSync, lstatSync } from "node:fs"
import { join } from "node:path"
import { versionErrors } from "./version-policy.mjs"

export const targets = [
  { id: "macos-arm64", runner: "macos-15", target: "aarch64-apple-darwin", bundles: "dmg", extension: ".dmg" },
  { id: "windows-amd64", runner: "windows-2022", target: "x86_64-pc-windows-msvc", bundles: "nsis", extension: ".exe" },
  { id: "linux-amd64", runner: "ubuntu-24.04", target: "x86_64-unknown-linux-gnu", bundles: "deb", extension: ".deb" },
  { id: "linux-arm64", runner: "ubuntu-24.04-arm", target: "aarch64-unknown-linux-gnu", bundles: "deb", extension: ".deb" },
]

export function releaseContext(version, commit) {
  if (versionErrors({ version }).length || !/^[a-f0-9]{40}$/.test(commit)) throw new Error("Invalid release version or commit")
}

export function assetName(target, version) {
  return `UFrame_${version}_${target.id}${target.extension}`
}

export function digest(path) {
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.size === 0) throw new Error("Artifact must be a nonempty regular file")
  return { size: stat.size, sha256: createHash("sha256").update(readFileSync(path)).digest("hex") }
}

export function filesBelow(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) throw new Error("Symlink artifacts are forbidden")
    return stat.isDirectory() ? filesBelow(path) : [path]
  })
}

export function verifyBinary(bytes, id) {
  let valid = false
  if (bytes.length >= 64) {
    if (id === "macos-arm64") {
      valid = bytes.readUInt32LE(0) === 0xfeedfacf && bytes.readUInt32LE(4) === 0x0100000c
    } else if (id === "windows-amd64") {
      const offset = bytes.readUInt32LE(0x3c)
      valid = bytes.toString("ascii", 0, 2) === "MZ" && offset + 6 <= bytes.length &&
        bytes.readUInt32LE(offset) === 0x00004550 && bytes.readUInt16LE(offset + 4) === 0x8664
    } else if (id === "linux-amd64" || id === "linux-arm64") {
      valid = bytes.toString("hex", 0, 4) === "7f454c46" && bytes[4] === 2 && bytes[5] === 1 &&
        bytes.readUInt16LE(18) === (id === "linux-amd64" ? 62 : 183)
    }
  }
  if (!valid) throw new Error(`Wrong executable architecture: ${id}`)
}

export function validateManifest(manifest, target, version, commit) {
  if (manifest.schemaVersion !== 1 || manifest.version !== version || manifest.commit !== commit ||
      manifest.target !== target.target || manifest.id !== target.id ||
      manifest.name !== assetName(target, version) || !Number.isSafeInteger(manifest.size) || manifest.size < 1 ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error(`Invalid manifest: ${target.id}`)
}

export function publishArgs(tag, files, notesPath) {
  const version = tag?.replace(/^v/, "")
  if (!tag?.startsWith("v") || versionErrors({ version }, tag).length) throw new Error("Invalid release tag")
  return ["release", "create", tag, ...files, "--verify-tag", "--title", `UFrame ${tag}`,
    "--notes-file", notesPath, "--latest=false", "--draft", ...(version.includes("-") ? ["--prerelease"] : [])]
}

export function devPublishArgs(tag) {
  return /^v\d+\.\d+\.\d+-dev\.[1-9]\d*$/.test(tag)
    ? ["release", "edit", tag, "--draft=false", "--prerelease", "--latest=false"]
    : null
}

export function verifyUploadedAssets(assets, expected) {
  if (!Array.isArray(assets) || assets.length !== expected.length) throw new Error("Uploaded asset set is incomplete")
  for (const file of expected) {
    const matches = assets.filter((asset) => asset.name === file.name)
    if (matches.length !== 1 || matches[0].state !== "uploaded" ||
        matches[0].size !== file.size || matches[0].digest !== `sha256:${file.sha256}`) throw new Error("Uploaded asset digest mismatch")
  }
}
