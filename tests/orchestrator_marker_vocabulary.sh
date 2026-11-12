#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# track_dir_resolve: prefer measure/archive/<id> if it exists,
# fall back to measure/tracks/<id>
track_dir_resolve() {
  local track_id="$1"
  if [ -d "measure/archive/$track_id" ]; then
    echo "measure/archive/$track_id"
  else
    echo "measure/tracks/$track_id"
  fi
}

status=0

track_id=""
if [ "${1:-}" = "--track" ]; then
  track_id="${2:-}"
  if [ -z "$track_id" ] || [ "$#" -ne 2 ]; then
    printf 'Usage: %s [--track <track-id>]\n' "$0" >&2
    exit 2
  fi
elif [ "$#" -ne 0 ]; then
  printf 'Usage: %s [--track <track-id>]\n' "$0" >&2
  exit 2
fi

# A8 guard: every top-level task line of a plan.md under measure/tracks/ (active)
# must use a marker from the set {` `, `~`, `x`, `b`}. `[ ]` (space) means
# pending: the task did not start. `[~]` means in progress, `[x]` means done,
# and `[b]` means blocked at a human gate (`deferred:<owner>`). Any other marker
# fails, because the supervisor and the status checker would read it differently.
# A closeout rule applies: a track moves to archive only when no task stays `[ ]`
# or `[~]`. This guard covers EVERY active track, not just review tracks.
# Archived plans (measure/archive/) are frozen historical snapshots and are
# excluded.
if [ -n "$track_id" ]; then
  track_dir="$(track_dir_resolve "$track_id")"
  plans=( "$track_dir/plan.md" )
else
  shopt -s nullglob
  plans=( measure/tracks/*/plan.md )
  shopt -u nullglob
fi

if [ "${#plans[@]}" -eq 0 ] || [ ! -f "${plans[0]}" ]; then
  printf 'FAIL: no plan.md found for requested scope\n' >&2
  exit 1
fi

for plan in "${plans[@]}"; do
  if grep -nE '^- \[[^ ~xb]\] ' "$plan" >/tmp/orchestrator-marker-hits.$$; then
    while IFS= read -r hit; do
      marker="${hit#*[}"
      marker="${marker%%]*}"
      printf 'FAIL: unsupported task marker [%s] in %s; use [ ], [~], [x], or [b] deferred:<owner>\n' "$marker" "$plan" >&2
    done </tmp/orchestrator-marker-hits.$$
    status=1
  fi
  rm -f /tmp/orchestrator-marker-hits.$$
done

if [ "$status" -ne 0 ]; then
  exit "$status"
fi

printf 'PASS: all active track plans use only [ ], [~], [x], or [b] task markers (%d plans checked)\n' "${#plans[@]}"
