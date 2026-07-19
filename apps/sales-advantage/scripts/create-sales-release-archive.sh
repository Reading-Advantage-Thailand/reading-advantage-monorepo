#!/usr/bin/env bash
set -euo pipefail

release_commit_sha="${1:-}"
output_root="${2:-}"

[[ "$release_commit_sha" =~ ^[0-9a-f]{40}$ ]] || {
  echo "release commit must be an exact lowercase 40-character commit" >&2
  exit 2
}
[[ -n "$output_root" ]] || {
  echo "release archive output directory is required" >&2
  exit 2
}
resolved_commit="$(git rev-parse --verify "${release_commit_sha}^{commit}")"
[[ "$resolved_commit" == "$release_commit_sha" ]] || {
  echo "release commit did not resolve exactly" >&2
  exit 2
}
mkdir -p "$output_root"
[[ -z "$(find "$output_root" -mindepth 1 -print -quit)" ]] || {
  echo "release archive output directory must be empty" >&2
  exit 2
}

git archive --format=tar "$release_commit_sha" -- .gcloudignore .pnpmfile.cjs package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json apps/sales-advantage packages measure/tracks/sales_advantage_golive_20260701/curriculum-approval.json |
  tar -xf - -C "$output_root"

node "$output_root/apps/sales-advantage/scripts/release-source-manifest.mjs" create "$release_commit_sha" "$output_root" "$output_root/apps/sales-advantage/release-source.json"
