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
track_ids=(
  monorepo_feature_review_masterplan_20260626
  shared_foundation_review_20260626
  reading_advantage_full_review_20260626
  primary_advantage_full_review_20260626
  science_advantage_review_20260626
  codecamp_advantage_review_20260626
  sales_advantage_review_20260626
  marketing_app_review_20260626
  advantage_games_review_20260626
  www_reading_advantage_review_20260626
  cross_app_workflows_review_20260626
  monorepo_review_roadmap_20260626
)
for tid in "${track_ids[@]}"; do
  dir="$(track_dir_resolve "$tid")"
  plan="$dir/plan.md"
  if [ ! -f "$plan" ]; then
    printf 'FAIL: expected plan file missing: %s\n' "$plan" >&2
    status=1
    continue
  fi
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

printf 'PASS: review planning tracks use only [~]/[x]/[b] task markers\n'
