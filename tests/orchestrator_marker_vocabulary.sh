#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

status=0
plans=(
  measure/tracks/monorepo_feature_review_masterplan_20260626/plan.md
  measure/tracks/shared_foundation_review_20260626/plan.md
  measure/tracks/reading_advantage_full_review_20260626/plan.md
  measure/tracks/primary_advantage_full_review_20260626/plan.md
  measure/tracks/science_advantage_review_20260626/plan.md
  measure/tracks/codecamp_advantage_review_20260626/plan.md
  measure/tracks/sales_advantage_review_20260626/plan.md
  measure/tracks/marketing_app_review_20260626/plan.md
  measure/tracks/advantage_games_review_20260626/plan.md
  measure/tracks/www_reading_advantage_review_20260626/plan.md
  measure/tracks/cross_app_workflows_review_20260626/plan.md
  measure/tracks/monorepo_review_roadmap_20260626/plan.md
)
for plan in "${plans[@]}"; do
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
