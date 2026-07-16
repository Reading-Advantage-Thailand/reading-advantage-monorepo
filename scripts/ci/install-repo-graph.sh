#!/usr/bin/env bash
# Builds the pinned repository graph CLI used by the hosted graph evidence gate.

set -euo pipefail

readonly REPO_GRAPH_REPOSITORY="https://github.com/bodangren/repo-graph.git"
readonly REPO_GRAPH_REVISION="0dda6f281379b1ee6a664b0468d95f15eaa62297"
readonly runner_temp="${RUNNER_TEMP:?RUNNER_TEMP is required}"
: "${GITHUB_PATH:?GITHUB_PATH is required}"

repository_dir="$(mktemp -d "${runner_temp}/repo-graph.XXXXXX")"
binary_dir="${runner_temp}/repo-graph-bin"

git init --quiet "$repository_dir"
git -C "$repository_dir" remote add origin "$REPO_GRAPH_REPOSITORY"
git -C "$repository_dir" fetch --depth=1 --quiet origin "$REPO_GRAPH_REVISION"
git -C "$repository_dir" checkout --quiet --detach FETCH_HEAD

resolved_revision="$(git -C "$repository_dir" rev-parse HEAD)"
if [ "$resolved_revision" != "$REPO_GRAPH_REVISION" ]; then
  echo "ERROR: repo-graph revision mismatch: expected $REPO_GRAPH_REVISION, got $resolved_revision" >&2
  exit 1
fi

(
  cd "$repository_dir"
  bun install --frozen-lockfile
  bun run build
)

mkdir -p "$binary_dir"
install -m 0755 "$repository_dir/bin/build-graph" "$binary_dir/build-graph"
printf '%s\n' "$binary_dir" >> "$GITHUB_PATH"
