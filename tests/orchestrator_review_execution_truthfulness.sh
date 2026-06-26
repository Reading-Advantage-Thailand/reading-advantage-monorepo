#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

status=0

# A11 guard: a review track with execution artifacts must not remain fully blocked as
# deferred:review-execution. That state hides executable/completed review work from the
# supervisor because [b] is a structured blocked marker.
for plan in measure/tracks/*/plan.md; do
  dir="${plan%/plan.md}"
  if ! ls "$dir"/review-*-result.json >/dev/null 2>&1; then
    continue
  fi

  total=$(grep -c '^- \[[~xb]\] ' "$plan" || true)
  blocked_deferred=$(grep -c '^- \[b\].*deferred:review-execution' "$plan" || true)
  if [ "$total" -gt 0 ] && [ "$total" = "$blocked_deferred" ]; then
    printf 'FAIL: executed review track remains fully [b] deferred:review-execution: %s\n' "$plan" >&2
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  exit "$status"
fi

printf 'PASS: executed review tracks are not fully blocked by deferred:review-execution\n'
