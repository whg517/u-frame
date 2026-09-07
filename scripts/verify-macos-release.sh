#!/usr/bin/env bash

set -euo pipefail

verify_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
verify_repo_root="$(cd "${verify_script_dir}/.." && pwd)"
verify_bundle_root="${1:-${verify_repo_root}/src-tauri/target/universal-apple-darwin/release/bundle}"
verify_checksum_file="${2:-${verify_repo_root}/SHA256SUMS}"

verify_app_path="$(find "${verify_bundle_root}/macos" -maxdepth 1 -type d -name '*.app' -print -quit)"
verify_dmg_path="$(find "${verify_bundle_root}/dmg" -maxdepth 1 -type f -name '*.dmg' -print -quit)"

if [[ -z "${verify_app_path}" || -z "${verify_dmg_path}" ]]; then
  printf 'ERROR: expected one .app and one .dmg below %s\n' "${verify_bundle_root}" >&2
  exit 1
fi

codesign --verify --deep --strict --verbose=2 "${verify_app_path}"
xcrun stapler validate "${verify_app_path}"
xcrun stapler validate "${verify_dmg_path}"

(
  cd "$(dirname "${verify_dmg_path}")"
  shasum -a 256 "$(basename "${verify_dmg_path}")" > "${verify_checksum_file}"
)

printf 'Verified signed and notarized app: %s\n' "${verify_app_path}"
printf 'Verified signed and notarized DMG: %s\n' "${verify_dmg_path}"
printf 'Wrote checksum: %s\n' "${verify_checksum_file}"
