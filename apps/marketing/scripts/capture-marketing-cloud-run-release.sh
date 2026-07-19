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
  local service_status_json
  local traffic_row
  local serving_revision
  local serving_percent
  local revision_image

  service_status_json="$(
    gcloud run services describe "$service" \
      --region="$region" \
      --platform=managed \
      --format=json
  )"
  traffic_row="$(
    python3 -c '
import json
import sys

payload = json.load(sys.stdin)
status = payload.get("status")
if not isinstance(status, dict):
    raise SystemExit("Marketing service status is missing")
traffic = status.get("traffic")
if not isinstance(traffic, list):
    raise SystemExit("Marketing service traffic is not an array")
serving = []
for row in traffic:
    if not isinstance(row, dict):
        raise SystemExit("Marketing service traffic contains a malformed row")
    percent = row.get("percent", 0)
    if isinstance(percent, bool) or not isinstance(percent, int) or not 0 <= percent <= 100:
        raise SystemExit("Marketing service traffic contains an invalid percent")
    if percent == 100:
        serving.append(row)
    elif percent != 0:
        raise SystemExit("Marketing service has split positive traffic")
if len(serving) != 1:
    raise SystemExit(f"Marketing service has {len(serving)} 100-percent traffic rows")
revision = serving[0].get("revisionName")
if not isinstance(revision, str) or not revision.strip():
    raise SystemExit("Serving Marketing traffic row has no revision")
if "\t" in revision or "\n" in revision:
    raise SystemExit("Serving Marketing revision contains an invalid field separator")
sys.stdout.write(f"{revision}\t100")
' <<< "$service_status_json"
  )"
  if [[ ! "$traffic_row" =~ ^[^[:space:]]+$'\t'100$ ]]; then
    echo "Marketing traffic must identify exactly one revision serving 100 percent" >&2
    exit 1
  fi
  IFS=$'\t' read -r serving_revision serving_percent <<< "$traffic_row"
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
  local service_status_json
  local candidate_row
  local expected_digest
  local expected_repository
  local revision_image

  if [[ ! "$tag" =~ ^c[0-9a-f]{8}$ ]]; then
    echo "Marketing candidate tag must be c followed by eight lowercase hex characters" >&2
    exit 1
  fi
  service_status_json="$(
    gcloud run services describe "$service" \
      --region="$region" \
      --platform=managed \
      --format=json
  )"
  candidate_row="$(
    python3 -c '
import json
import sys

tag = sys.argv[1]
payload = json.load(sys.stdin)
status = payload.get("status")
if not isinstance(status, dict):
    raise SystemExit("Marketing service status is missing")
traffic = status.get("traffic")
if not isinstance(traffic, list):
    raise SystemExit("Marketing service traffic is not an array")
matches = []
for row in traffic:
    if not isinstance(row, dict):
        raise SystemExit("Marketing service traffic contains a malformed row")
    row_tag = row.get("tag")
    if row_tag is not None and not isinstance(row_tag, str):
        raise SystemExit("Marketing service traffic contains a malformed tag")
    if row_tag == tag:
        matches.append(row)
if len(matches) != 1:
    raise SystemExit(f"Marketing candidate tag matched {len(matches)} traffic rows")
match = matches[0]
url = match.get("url")
revision = match.get("revisionName")
latest = status.get("latestCreatedRevisionName")
if not isinstance(url, str) or not url.strip():
    raise SystemExit("Tagged Marketing traffic row has no URL")
if not isinstance(revision, str) or not revision.strip():
    raise SystemExit("Tagged Marketing traffic row has no revision")
if not isinstance(latest, str) or not latest.strip():
    raise SystemExit("Marketing service has no latest-created revision")
if any("\t" in value or "\n" in value for value in (url, revision, latest)):
    raise SystemExit("Marketing service traffic contains an invalid field separator")
sys.stdout.write("\t".join((url, revision, latest)))
' "$tag" <<< "$service_status_json"
  )"
  IFS=$'\t' read -r tagged_url tagged_revision latest_created_revision <<< "$candidate_row"
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
