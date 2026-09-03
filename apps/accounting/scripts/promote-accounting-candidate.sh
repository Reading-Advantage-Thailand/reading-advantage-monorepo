#!/usr/bin/env bash
set -Eeuo pipefail

: "${CANDIDATE_REVISION:?CANDIDATE_REVISION is required}"
: "${ACCEPTANCE_NOTE:?ACCEPTANCE_NOTE is required}"

[[ -s "$ACCEPTANCE_NOTE" ]] || { echo "Acceptance note is missing or empty." >&2; exit 2; }
grep -Eq '^status: pass$' "$ACCEPTANCE_NOTE" || { echo "Acceptance note must contain status: pass." >&2; exit 2; }

gcloud run services update-traffic accounting \
  --region=asia-southeast1 \
  --platform=managed \
  --to-revisions="$CANDIDATE_REVISION=100"

echo "Opening public Accounting access after acceptance."
gcloud run services add-iam-policy-binding accounting \
  --region=asia-southeast1 \
  --member=allUsers \
  --role=roles/run.invoker

unset ACCOUNTING_VERIFY_IDENTITY_TOKEN
export ACCOUNTING_RELEASE_BASE_URL=https://accounting.reading-advantage.com
verified=false
for attempt in $(seq 1 12); do
  if pnpm --filter accounting exec tsx scripts/verify-accounting-release.ts; then
    verified=true
    break
  fi
  sleep 5
done
[[ "$verified" == true ]]
