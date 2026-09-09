import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { cargoVersions, versionErrors } from "./lib/version-policy.mjs"

const root = resolve(import.meta.dirname, "..")
const read = (path) => readFileSync(resolve(root, path), "utf8")
const versions = {
  "package.json": JSON.parse(read("package.json")).version,
  "src-tauri/tauri.conf.json": JSON.parse(read("src-tauri/tauri.conf.json")).version,
  ...cargoVersions(read("src-tauri/Cargo.toml"), read("src-tauri/Cargo.lock")),
}
const errors = versionErrors(versions, process.argv[2])
if (errors.length) {
  errors.forEach((message) => console.error(`ERROR: ${message}`))
  process.exitCode = 1
} else {
  console.log(`Application version ${versions["package.json"]} is consistent across four files${process.argv[2] ? ` and tag ${process.argv[2]}` : ""}.`)
}
