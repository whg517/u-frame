#!/usr/bin/env bash
set -euo pipefail
release_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${release_root}"
: "${GITHUB_REF_NAME:?release tag is required}"
: "${GITHUB_SHA:?release commit is required}"
node scripts/check-version.mjs "${GITHUB_REF_NAME}"
if [[ "$(git cat-file -t "refs/tags/${GITHUB_REF_NAME}")" != "tag" ]]; then
  printf 'ERROR: release tags must be annotated tags\n' >&2
  exit 1
fi
tag_commit="$(git rev-parse "refs/tags/${GITHUB_REF_NAME}^{commit}")"
if [[ "${tag_commit}" != "$(git rev-parse "${GITHUB_SHA}^{commit}")" ]] ||
   ! git merge-base --is-ancestor "${tag_commit}" refs/remotes/origin/main; then
  printf 'ERROR: release tag must match the event commit and belong to origin/main\n' >&2
  exit 1
fi
