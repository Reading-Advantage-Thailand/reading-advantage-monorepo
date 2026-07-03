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

# A8 guard: NO plan.md under measure/tracks/ (active) may use the deprecated
# `[ ]` (space) marker. The supervisor regex `^- \[([~xb])\]` intentionally
# ignores `[ ]`, so a stale `[ ]` task is invisible to the supervisor (silently
# dropped from the incomplete-task count) while a separate status checker may
# still count it as incomplete — an ambiguity that inflates status reports.
# This guard must cover EVERY active track, not just review tracks, or product
# tracks regress silently. Archived plans (measure/archive/) are frozen
# historical snapshots and are intentionally excluded.
shopt -s nullglob
plans=( measure/tracks/*/plan.md )
shopt -u nullglob

if [ "${#plans[@]}" -eq 0 ]; then
  printf 'FAIL: no plan.md files found under measure/tracks\n' >&2
  exit 1
fi

for plan in "${plans[@]}"; do
  if grep -n '^- \[ \] ' "$plan" >/tmp/orchestrator-marker-hits.$$; then
    printf 'FAIL: deprecated [ ] markers in %s; use [~], [x], or [b] deferred:<owner>\n' "$plan" >&2
    cat /tmp/orchestrator-marker-hits.$$ >&2
    status=1
  fi
  rm -f /tmp/orchestrator-marker-hits.$$
done

if [ "$status" -ne 0 ]; then
  exit "$status"
fi

printf 'PASS: all active track plans use only [~]/[x]/[b] task markers (%d plans checked)\n' "${#plans[@]}"
