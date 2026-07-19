#!/usr/bin/env bash
set -Eeuo pipefail

: "${CANDIDATE_REVISION:?CANDIDATE_REVISION is required}"

service="sales-advantage"
region="asia-southeast1"
rollback_revision="sales-advantage-00004-jed"
digest="sha256:ab7ca4d4429cad3d81a28fe9b9f85e03c78cb62f2e075142152982e0f7415ce3"
verifier="apps/sales-advantage/scripts/verify-sales-continuation-public.py"
promoted=false

restore_rollback() {
  local status=$?
  trap - ERR EXIT
  if [[ "$promoted" != true ]]; then
    gcloud run services update-traffic "$service"       --region="$region"       --platform=managed       --to-revisions="$rollback_revision=100"
    python3 "$verifier"       --mode legacy-school       --revision "$rollback_revision"       --digest "$digest"       --traffic 100       --base-url "https://sales.reading-advantage.com"
  fi
  exit "$status"
}
trap restore_rollback ERR EXIT

gcloud run services update-traffic "$service"   --region="$region"   --platform=managed   --to-revisions="$CANDIDATE_REVISION=100"
python3 "$verifier"   --mode company   --revision "$CANDIDATE_REVISION"   --digest "$digest"   --traffic 100   --base-url "https://sales.reading-advantage.com"
promoted=true
trap - ERR EXIT
