#!/usr/bin/env bash
set -Eeuo pipefail

: "${CANDIDATE_REVISION:?CANDIDATE_REVISION is required}"
: "${ACCEPTANCE_NOTE:?ACCEPTANCE_NOTE is required}"

[[ -s "$ACCEPTANCE_NOTE" ]] || { echo "Acceptance note is missing or empty." >&2; exit 2; }
grep -Eq '^status: pass$' "$ACCEPTANCE_NOTE" || { echo "Acceptance note must contain status: pass." >&2; exit 2; }

gcloud run services update-traffic sales-advantage \
  --region=asia-southeast1 \
  --platform=managed \
  --to-revisions="$CANDIDATE_REVISION=100"

export SALES_RELEASE_BASE_URL=https://sales.reading-advantage.com
export SALES_RELEASE_EXPECTED_MODE=company
verified=false
for attempt in $(seq 1 12); do
  if pnpm --filter sales-advantage exec tsx scripts/verify-sales-release.ts; then
    verified=true
    break
  fi
  sleep 5
done
[[ "$verified" == true ]]
