#!/usr/bin/env bash
set -euo pipefail

service="marketing"
region="asia-southeast1"

capture_current() {
  if [[ $# -ne 1 ]]; then
    echo "usage: capture-marketing-cloud-run-release.sh current OUTPUT_PREFIX" >&2
    exit 2
  fi
  local output_prefix="$1"
  local traffic_row
  local serving_revision
  local serving_percent
  local revision_image

  traffic_row="$(
    gcloud run services describe "$service" \
      --region="$region" \
      --platform=managed \
      --format="csv[no-heading](status.traffic.revisionName,status.traffic.percent)"
  )"
  if [[ ! "$traffic_row" =~ ^[^,[:space:]]+,[0-9]+$ ]]; then
    echo "Marketing traffic must contain exactly one revision and percent row" >&2
    exit 1
  fi
  IFS="," read -r serving_revision serving_percent <<< "$traffic_row"
  if [[ -z "$serving_revision" || "$serving_revision" == *";"* || ! "$serving_percent" =~ ^[0-9]+$ || "$serving_percent" != "100" ]]; then
    echo "Marketing must have exactly one revision serving 100 percent of traffic" >&2
    exit 1
  fi
  revision_image="$(
    gcloud run revisions describe "$serving_revision" \
      --region="$region" \
      --platform=managed \
      --format="value(spec.containers[0].image)"
  )"
  if [[ ! "$revision_image" =~ @sha256:[0-9a-f]{64}$ ]]; then
    echo "Serving Marketing revision does not expose an immutable image digest" >&2
    exit 1
  fi

  printf '%s' "$serving_revision" > "${output_prefix}.revision"
  printf '%s' "$revision_image" > "${output_prefix}.image"
  printf '{"level":"info","event":"marketing_previous_release_captured","revision":"%s","image":"%s"}\n' \
    "$serving_revision" "$revision_image"
}

capture_candidate() {
  if [[ $# -ne 3 ]]; then
    echo "usage: capture-marketing-cloud-run-release.sh candidate TAG EXPECTED_IMAGE OUTPUT_PREFIX" >&2
    exit 2
  fi
  local tag="$1"
  local expected_image="$2"
  local output_prefix="$3"
  local tagged_url
  local tagged_revision
  local latest_created_revision
  local expected_digest
  local expected_repository
  local revision_image

  if [[ ! "$tag" =~ ^candidate-[a-z0-9-]+$ ]]; then
    echo "Marketing candidate tag is not collision-safe" >&2
    exit 1
  fi
  tagged_url="$(
    gcloud run services describe "$service" \
      --region="$region" \
      --platform=managed \
      --format="value(status.traffic[?tag='${tag}'].url)"
  )"
  tagged_revision="$(
    gcloud run services describe "$service" \
      --region="$region" \
      --platform=managed \
      --format="value(status.traffic[?tag='${tag}'].revisionName)"
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
    echo "Tagged Marketing URL was not published for ${tag}" >&2
    exit 1
  fi
  if [[ -z "$tagged_revision" || "$tagged_revision" != "$latest_created_revision" ]]; then
    echo "Tagged Marketing revision is not the newly created revision" >&2
    exit 1
  fi
  if [[ ! "$expected_digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    echo "Expected Marketing image digest is invalid" >&2
    exit 1
  fi
  if [[ "$revision_image" != "${expected_repository}@${expected_digest}" ]]; then
    echo "Tagged Marketing revision does not run the release image digest" >&2
    exit 1
  fi

  printf '%s' "$tagged_url" > "${output_prefix}.url"
  printf '%s' "$tagged_revision" > "${output_prefix}.revision"
  printf '%s' "$revision_image" > "${output_prefix}.image"
  printf '{"level":"info","event":"marketing_candidate_release_captured","tag":"%s","revision":"%s","image":"%s"}\n' \
    "$tag" "$tagged_revision" "$revision_image"
}

if [[ $# -lt 1 ]]; then
  echo "usage: capture-marketing-cloud-run-release.sh MODE ..." >&2
  exit 2
fi

mode="$1"
shift
case "$mode" in
  current) capture_current "$@" ;;
  candidate) capture_candidate "$@" ;;
  *)
    echo "unknown capture mode: ${mode}" >&2
    exit 2
    ;;
esac
