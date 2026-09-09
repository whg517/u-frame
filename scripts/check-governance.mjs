import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { parse } from "yaml"
import { workflowErrors } from "./lib/workflow-policy.mjs"

const root = resolve(import.meta.dirname, "..")
const read = (p) => readFileSync(resolve(root, p), "utf8")
const errors = []
const inventory = JSON.parse(read("scripts/root-files.json"))
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).trim().split("\n")
for (const path of files) {
  if (!path.includes("/") && !inventory[path]) errors.push(`Unclassified root file: ${path}`)
}
for (const file of Object.keys(inventory)) {
  if (!files.includes(file)) errors.push(`Missing declared root file: ${file}`)
}
for (const name of readdirSync(resolve(root, ".github/workflows"))) {
  if (!/\.ya?ml$/.test(name)) continue
  try { errors.push(...workflowErrors(name, parse(read(`.github/workflows/${name}`)))) }
  catch (error) { errors.push(`${name}: invalid workflow YAML: ${error.message}`) }
}
for (const file of ["src-tauri/src/application/layout_service.rs", "src-tauri/src/application/ports.rs"]) {
  if (/\b(?:sqlx|infrastructure)::/.test(read(file))) errors.push(`${file}: the use case must depend on application ports, not adapters`)
}
if (/\b(?:sqlx|infrastructure)::/.test(read("src-tauri/src/error.rs"))) errors.push("IPC errors must not depend on database adapters")
for (const file of files.filter((p) => /^src-tauri\/src\/domain\/.*\.rs$/.test(p))) {
  if (/\b(?:crate|sqlx|serde|specta|tauri)::/.test(read(file))) errors.push(`${file}: domain must be standalone std-only Rust`)
}
const pkg = JSON.parse(read("package.json"))
for (const name of ["shadcn", "@tailwindcss/vite", "tailwindcss"]) {
  if (pkg.dependencies?.[name] || !pkg.devDependencies?.[name]) errors.push(`${name} must be a development dependency`)
}
if (errors.length) {
  errors.forEach((message) => console.error(`ERROR: ${message}`))
  process.exit(1)
}
console.log("Repository inventory, workflow and architecture policies passed.")
