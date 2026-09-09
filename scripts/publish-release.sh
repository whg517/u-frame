#!/usr/bin/env bash
set -euo pipefail
publish_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/release-artifacts.sh
source "${publish_root}/scripts/lib/release-artifacts.sh"
: "${GITHUB_REF_NAME:?release tag is required}"
: "${GH_TOKEN:?release token is required}"
resolve_release_artifacts "${1:?bundle root is required}"
checksum_file="${2:?checksum file is required}"
if [[ ! -s "${checksum_file}" ]]; then
  printf 'ERROR: verified checksum is required\n' >&2
  exit 1
fi
checksum_file="$(cd "$(dirname "${checksum_file}")" && pwd)/$(basename "${checksum_file}")"
expected_checksum="$(cd "$(dirname "${RELEASE_DMG_PATH}")" && shasum -a 256 "$(basename "${RELEASE_DMG_PATH}")")"
if [[ "$( < "${checksum_file}")" != "${expected_checksum}" ]]; then
  printf 'ERROR: checksum must match the exact release DMG\n' >&2
  exit 1
fi
release_args=("${GITHUB_REF_NAME}" "${RELEASE_DMG_PATH}#UFrame universal macOS DMG"
  "${checksum_file}#SHA-256 checksums" --draft --generate-notes --title "UFrame ${GITHUB_REF_NAME}" --verify-tag)
if [[ "${GITHUB_REF_NAME}" == *-* ]]; then release_args+=(--prerelease); fi
gh release create "${release_args[@]}"
