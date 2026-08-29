#!/usr/bin/env bash
set -Eeuo pipefail

: "${CANDIDATE_REVISION:?CANDIDATE_REVISION is required}"
: "${PREVIOUS_REVISION:?PREVIOUS_REVISION is required}"
: "${PREVIOUS_IMAGE:?PREVIOUS_IMAGE is required}"
: "${CANDIDATE_IMAGE:?CANDIDATE_IMAGE is required}"
: "${BUILD_ID:?BUILD_ID is required}"
: "${RELEASE_COMMIT_SHA:?RELEASE_COMMIT_SHA is required}"
: "${ACCEPTANCE_NOTE:?ACCEPTANCE_NOTE is required}"

[[ -s "$ACCEPTANCE_NOTE" ]] || { echo "Acceptance note is missing or empty." >&2; exit 2; }
grep -Eq '^status: pass$' "$ACCEPTANCE_NOTE" || { echo "Acceptance note must contain status: pass." >&2; exit 2; }

gcloud run services update-traffic marketing \
  --region=asia-southeast1 \
  --platform=managed \
  --to-revisions="$CANDIDATE_REVISION=100"

domain=marketing.reading-advantage.com
route=$(gcloud beta run domain-mappings describe --domain="$domain" --region=asia-southeast1 --platform=managed --format="value(spec.routeName)")
mapped_route=$(gcloud beta run domain-mappings describe --domain="$domain" --region=asia-southeast1 --platform=managed --format="value(status.mappedRouteName)")
[[ "$route" == marketing ]]
[[ "$mapped_route" == marketing ]]
for condition in Ready CertificateProvisioned DomainRoutable; do
  status=$(gcloud beta run domain-mappings describe --domain="$domain" --region=asia-southeast1 --platform=managed --format="value(status.conditions.filter('type=$condition').extract(status).flatten(show=values))")
  [[ "$status" == True ]]
done

export MARKETING_RELEASE_BASE_URL=https://marketing.reading-advantage.com
verified=false
for attempt in $(seq 1 12); do
  if pnpm --filter marketing exec tsx scripts/verify-marketing-release.ts; then
    verified=true
    break
  fi
  sleep 5
done
[[ "$verified" == true ]]
bash apps/marketing/scripts/marketing-smoke.sh "$MARKETING_RELEASE_BASE_URL"

serving_revision=$(gcloud run services describe marketing --region=asia-southeast1 --platform=managed --format="value(status.traffic.filter('percent=100').extract(revisionName).flatten(show=values))")
[[ "$serving_revision" == "$CANDIDATE_REVISION" ]]
[[ "$PREVIOUS_REVISION" != "$CANDIDATE_REVISION" ]]
printf '{"level":"info","event":"marketing_release_promoted","buildId":"%s","releaseCommitSha":"%s","previousRevision":"%s","previousImage":"%s","candidateRevision":"%s","candidateImage":"%s","rollbackCommand":"gcloud run services update-traffic marketing --region=asia-southeast1 --platform=managed --to-revisions=%s=100"}\n' \
  "$BUILD_ID" "$RELEASE_COMMIT_SHA" "$PREVIOUS_REVISION" "$PREVIOUS_IMAGE" "$CANDIDATE_REVISION" "$CANDIDATE_IMAGE" "$PREVIOUS_REVISION"
