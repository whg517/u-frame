#!/usr/bin/env bash
set -euo pipefail
domain_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
domain_tmp="$(mktemp -d)"
trap 'rm -f "${domain_tmp}/domain-tests"; rmdir "${domain_tmp}"' EXIT
rustc --edition=2024 --deny warnings --test "${domain_root}/src-tauri/src/domain/mod.rs" -o "${domain_tmp}/domain-tests"
"${domain_tmp}/domain-tests"
