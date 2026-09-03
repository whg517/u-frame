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
bash -n scripts/gate.sh .githooks/pre-commit

printf '%s\n' '[gate] documentation'
pnpm docs:check

printf '%s\n' '[gate] frontend lint (when configured)'
pnpm run --if-present lint

printf '%s\n' '[gate] frontend tests (when configured)'
pnpm run --if-present test

printf '%s\n' '[gate] frontend build'
pnpm build

printf '%s\n' '[gate] Rust formatting'
cargo fmt --manifest-path "${gate_manifest}" --check

printf '%s\n' '[gate] Rust check'
cargo check --manifest-path "${gate_manifest}"

printf '%s\n' '[gate] Rust clippy'
cargo clippy --manifest-path "${gate_manifest}" --all-targets --all-features -- -D warnings

printf '%s\n' '[gate] Rust tests'
cargo test --manifest-path "${gate_manifest}"

printf '%s\n' '[gate] all checks passed'
