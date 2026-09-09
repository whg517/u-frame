import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { assetName, digest, filesBelow, releaseContext, targets, validateManifest, verifyBinary } from "./lib/release-policy.mjs"

const root = resolve(import.meta.dirname, "..")
export function collect(id, bundle, binary, output, version, commit) {
  releaseContext(version, commit)
  const target = targets.find((item) => item.id === id)
  if (!target) throw new Error("Unsupported release target")
  verifyBinary(readFileSync(binary), id)
  const files = filesBelow(join(bundle, target.bundles)).filter((path) => path.endsWith(target.extension))
  if (files.length !== 1) throw new Error("Exactly one package is required per target")
  const metadata = digest(files[0])
  if (id.startsWith("linux-")) {
    const architecture = execFileSync("dpkg-deb", ["--field", files[0], "Architecture"], { encoding: "utf8" }).trim()
    if (architecture !== id.replace("linux-", "")) throw new Error("DEB architecture mismatch")
  }
  mkdirSync(output, { recursive: true })
  if (readdirSync(output).length) throw new Error("Artifact output must be empty")
  const name = assetName(target, version)
  copyFileSync(files[0], join(output, name))
  writeFileSync(join(output, "manifest.json"), JSON.stringify({ schemaVersion: 1, id, target: target.target, version, commit, name, ...metadata }, null, 2) + "\n")
}

export function verify(input, output, version, commit) {
  releaseContext(version, commit)
  const files = filesBelow(input)
  const manifests = files.filter((path) => basename(path) === "manifest.json")
  if (manifests.length !== targets.length || files.length !== targets.length * 2) throw new Error("Exactly four packages and four manifests are required")
  const records = manifests.map((path) => ({ path, value: JSON.parse(readFileSync(path, "utf8")) }))
  const verified = targets.map((target) => {
    const matches = records.filter((record) => record.value.id === target.id)
    if (matches.length !== 1) throw new Error(`Missing or duplicate target: ${target.id}`)
    const { path, value } = matches[0]
    validateManifest(value, target, version, commit)
    const artifact = resolve(path, "..", value.name)
    if (!files.includes(artifact)) throw new Error("Artifact must accompany its manifest")
    const actual = digest(artifact)
    if (value.sha256 !== actual.sha256 || value.size !== actual.size) throw new Error("Artifact checksum or size mismatch")
    return { path: artifact, ...value }
  })
  mkdirSync(output, { recursive: true })
  if (readdirSync(output).length) throw new Error("Release output must be empty")
  for (const record of verified) copyFileSync(record.path, join(output, record.name))
  writeFileSync(join(output, "SHA256SUMS"), verified.map((record) => `${record.sha256}  ${record.name}\n`).join(""))
  writeFileSync(join(output, "release-manifest.json"), JSON.stringify({
    schemaVersion: 1, version, commit,
    artifacts: verified.map(({ schemaVersion, id, target, version, commit, name, size, sha256 }) =>
      ({ schemaVersion, id, target, version, commit, name, size, sha256 })),
  }, null, 2) + "\n")
  return verified
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2)
  const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim()
  if (command === "collect" && args.length === 4) collect(...args.map((v, i) => i ? resolve(v) : v), version, commit)
  else if (command === "verify" && args.length === 2) verify(...args.map((v) => resolve(v)), version, commit)
  else throw new Error("Usage: collect <target> <bundle> <binary> <output> | verify <input> <output>")
}
