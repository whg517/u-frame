import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const config = readFileSync(resolve(root, "rust-toolchain.toml"), "utf8")
const channel = config.match(/^channel = "([0-9]+\.[0-9]+\.[0-9]+)"$/m)?.[1]
if (!channel) throw new Error("rust-toolchain.toml must pin an exact toolchain")
const profile = config.match(/^profile = "([a-z]+)"$/m)?.[1]
const components = JSON.parse(config.match(/^components = (\[.*\])$/m)?.[1] ?? "null")
if (!profile || !Array.isArray(components) || !components.every((c) => typeof c === "string" && /^[a-z-]+$/.test(c))) throw new Error("Explicit Rust profile and components are required")
const commands = [
  ["toolchain", "install", channel, "--profile", profile, "--component", components.join(",")],
]
if (process.argv.includes("--universal")) {
  commands.push(["target", "add", "aarch64-apple-darwin", "x86_64-apple-darwin", "--toolchain", channel])
}
for (const args of commands) {
  const result = spawnSync("rustup", args, { stdio: "inherit", cwd: root })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
