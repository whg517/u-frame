import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import test from "node:test"

test("Rust installer reads canonical pins without changing the user's global default", (t) => {
  const root = resolve(import.meta.dirname, "../..")
  const path = mkdtempSync(join(tmpdir(), "uframe-toolchain-test-"))
  t.after(() => rmSync(path, { recursive: true, force: true }))
  const log = join(path, "calls")
  writeFileSync(join(path, "rustup"), '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >> "$TEST_LOG"\nexit "${TEST_RUSTUP_FAILURE:-0}"\n', { mode: 0o755 })
  const env = { ...process.env, PATH: `${path}:${process.env.PATH}`, TEST_LOG: log }
  const config = readFileSync(join(root, "rust-toolchain.toml"), "utf8")
  const channel = config.match(/^channel = "([^"]+)"$/m)[1]
  const run = (extra = {}) => spawnSync(process.execPath, [join(root, "scripts/install-rust-toolchain.mjs")], { encoding: "utf8", env: { ...env, ...extra } })
  assert.equal(run().status, 0)
  const calls = readFileSync(log, "utf8").trim().split("\n")
  assert.deepEqual(calls, [
    `toolchain install ${channel} --profile minimal --component clippy,rustfmt`,
  ])
  rmSync(log)
  assert.equal(run({ TEST_RUSTUP_FAILURE: "9" }).status, 9)
  assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 1)
})
