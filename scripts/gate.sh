#!/usr/bin/env bash

set -euo pipefail

gate_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
gate_repo_root="$(cd "${gate_script_dir}/.." && pwd)"
gate_manifest="${gate_repo_root}/src-tauri/Cargo.toml"

cd "${gate_repo_root}"

printf '%s\n' '[gate] Git whitespace'
git diff --check
git diff --cached --check

printf '%s\n' '[gate] shell syntax'
# Some releases have no Shell helpers under lib; unmatched globs are not files.
shopt -s nullglob
for gate_shell in scripts/*.sh scripts/lib/*.sh .githooks/pre-commit; do
  bash -n "${gate_shell}"
done

printf '%s\n' '[gate] repository and workflow policies'
pnpm governance:check

printf '%s\n' '[gate] tooling regression tests'
pnpm test:tools

printf '%s\n' '[gate] standalone domain boundary'
pnpm domain:check

printf '%s\n' '[gate] documentation'
pnpm docs:check

printf '%s\n' '[gate] version consistency'
pnpm version:check

printf '%s\n' '[gate] generated IPC bindings'
pnpm bindings:check

printf '%s\n' '[gate] frontend lint'
pnpm lint

printf '%s\n' '[gate] frontend typecheck'
pnpm typecheck

printf '%s\n' '[gate] frontend tests'
pnpm test

printf '%s\n' '[gate] frontend build'
pnpm build

printf '%s\n' '[gate] Rust formatting'
cargo fmt --manifest-path "${gate_manifest}" --check

printf '%s\n' '[gate] Rust clippy'
cargo clippy --manifest-path "${gate_manifest}" --all-targets --all-features -- -D warnings

printf '%s\n' '[gate] Rust release check'
cargo clippy --manifest-path "${gate_manifest}" --release -- -D warnings

printf '%s\n' '[gate] Rust tests'
cargo test --manifest-path "${gate_manifest}" --all-targets

printf '%s\n' '[gate] all checks passed'
