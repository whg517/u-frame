#!/usr/bin/env bash
set -euo pipefail
release_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
required=(APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD APPLE_SIGNING_IDENTITY APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID)
missing=()
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then missing+=("${name}"); fi
done
if (( ${#missing[@]} > 0 )); then
  printf 'ERROR: missing release credentials: %s\n' "${missing[*]}" >&2
  exit 1
fi
cd "${release_root}"
pnpm release:build
