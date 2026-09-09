#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "--" ]]; then shift; fi
verify_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
verify_repo_root="$(cd "${verify_script_dir}/.." && pwd)"
verify_bundle_root="${1:-${verify_repo_root}/src-tauri/target/universal-apple-darwin/release/bundle}"
verify_checksum_file="${2:-${verify_repo_root}/SHA256SUMS}"
# shellcheck source=scripts/lib/release-artifacts.sh
source "${verify_script_dir}/lib/release-artifacts.sh"
resolve_release_artifacts "${verify_bundle_root}"
verify_checksum_file="$(cd "$(dirname "${verify_checksum_file}")" && pwd)/$(basename "${verify_checksum_file}")"
executable="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "${RELEASE_APP_PATH}/Contents/Info.plist")"
if [[ -z "${executable}" || "${executable}" == */* || "${executable}" == "." || "${executable}" == ".." ]]; then
  printf 'ERROR: invalid application executable\n' >&2
  exit 1
fi
lipo -verify_arch arm64 x86_64 "${RELEASE_APP_PATH}/Contents/MacOS/${executable}"
codesign --verify --deep --strict --verbose=2 "${RELEASE_APP_PATH}"
codesign --verify --strict --verbose=2 "${RELEASE_DMG_PATH}"
spctl --assess --type execute --verbose=2 "${RELEASE_APP_PATH}"
xcrun stapler validate "${RELEASE_APP_PATH}"
xcrun stapler validate "${RELEASE_DMG_PATH}"
checksum_tmp="$(mktemp "${verify_checksum_file}.tmp.XXXXXX")"
trap 'rm -f "${checksum_tmp}"' EXIT
(cd "$(dirname "${RELEASE_DMG_PATH}")" && shasum -a 256 "$(basename "${RELEASE_DMG_PATH}")") > "${checksum_tmp}"
mv "${checksum_tmp}" "${verify_checksum_file}"
printf 'Verified Universal architecture, signature, Gatekeeper and notarization\n'
printf 'Wrote checksum: %s\n' "${verify_checksum_file}"
