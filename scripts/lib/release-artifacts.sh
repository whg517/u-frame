#!/usr/bin/env bash

# Sets exact artifact paths; callers must reject missing or ambiguous build output.
resolve_release_artifacts() {
  local bundle_root="$1"
  local -a apps dmgs
  shopt -s nullglob
  apps=("${bundle_root}"/macos/*.app)
  dmgs=("${bundle_root}"/dmg/*.dmg)
  shopt -u nullglob
  if (( ${#apps[@]} != 1 || ${#dmgs[@]} != 1 )); then
    printf 'ERROR: expected exactly one .app and one .dmg\n' >&2
    return 1
  fi
  if [[ ! -d "${apps[0]}" || ! -f "${dmgs[0]}" ]]; then
    printf 'ERROR: invalid release artifact types\n' >&2
    return 1
  fi
  RELEASE_APP_PATH="${apps[0]}"
  RELEASE_DMG_PATH="${dmgs[0]}"
  export RELEASE_APP_PATH RELEASE_DMG_PATH
}
