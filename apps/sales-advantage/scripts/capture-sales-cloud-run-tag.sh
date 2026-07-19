#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "usage: capture-sales-cloud-run-tag.sh TAG EXPECTED_IMAGE OUTPUT_PREFIX" >&2
  exit 2
fi

tag="$1"
expected_image="$2"
output_prefix="$3"
service="sales-advantage"
region="asia-southeast1"

tagged_url="$(
  gcloud run services describe "$service" \
    --region="$region" \
    --platform=managed \
    --format="value(status.traffic.filter(tag='${tag}').extract(url).flatten())"
)"
tagged_revision="$(
  gcloud run services describe "$service" \
    --region="$region" \
    --platform=managed \
    --format="value(status.traffic.filter(tag='${tag}').extract(revisionName).flatten())"
)"
latest_created_revision="$(
  gcloud run services describe "$service" \
    --region="$region" \
    --platform=managed \
    --format="value(status.latestCreatedRevisionName)"
)"
expected_digest="$(
  gcloud artifacts docker images describe "$expected_image" \
    --format="value(image_summary.digest)"
)"
revision_image="$(
  gcloud run revisions describe "$tagged_revision" \
    --region="$region" \
    --platform=managed \
    --format="value(spec.containers[0].image)"
)"
expected_repository="${expected_image%:*}"

if [[ "$tagged_url" != "https://${tag}---"* ]]; then
  echo "Tagged Sales URL was not published for ${tag}" >&2
  exit 1
fi
if [[ -z "$tagged_revision" || "$tagged_revision" != "$latest_created_revision" ]]; then
  echo "Tagged Sales revision is not the newly created revision" >&2
  exit 1
fi
if [[ ! "$expected_digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "Expected Sales image digest is invalid" >&2
  exit 1
fi
if [[ "$revision_image" != "${expected_repository}@${expected_digest}" ]]; then
  echo "Tagged Sales revision does not run the release image digest" >&2
  exit 1
fi

printf '%s' "$tagged_url" > "${output_prefix}.url"
printf '%s' "$tagged_revision" > "${output_prefix}.revision"
