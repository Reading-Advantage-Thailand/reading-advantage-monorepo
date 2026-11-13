#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Cloud Build must provide PROJECT_ID}"
: "${CODECAMP_REVIEW_WORKER_TICK_TOKEN:?Cloud Build must provide the scheduler bearer token from Secret Manager}"

readonly job_name="codecamp-review-worker-tick"
readonly location="${REVIEW_WORKER_SCHEDULER_LOCATION:-asia-southeast1}"
readonly schedule="*/2 * * * *"
readonly uri="https://codecamp.reading-advantage.com/api/internal/review-worker-tick"
# The Cloud Build service account must have roles/cloudscheduler.admin (or
# equivalent create/update permission) in the Codecamp project before this step runs.
# The bearer token travels through a temp flags file, so it stays out of argv and out of the build log.

flags_file="$(mktemp)"
chmod 600 "${flags_file}"
trap 'rm -f "${flags_file}"' EXIT

# Writes one header flag into the flags file. The token never reaches a command line.
write_header_flag() {
  local flag_name="$1"
  local safe_token="${CODECAMP_REVIEW_WORKER_TICK_TOKEN//\'/\'\'}"
  printf -- "%s:\n  Authorization: 'Bearer %s'\n" "${flag_name}" "${safe_token}" >"${flags_file}"
}

common_args=(
  "--project=${PROJECT_ID}"
  "--location=${location}"
  "--schedule=${schedule}"
  "--uri=${uri}"
  "--http-method=POST"
  "--time-zone=Etc/UTC"
)

if gcloud scheduler jobs describe "${job_name}" --project="${PROJECT_ID}" --location="${location}" >/dev/null 2>&1; then
  write_header_flag "--update-headers"
  gcloud scheduler jobs update http --flags-file="${flags_file}" "${job_name}" "${common_args[@]}" "--attempt-deadline=180s" --format=none
else
  write_header_flag "--headers"
  gcloud scheduler jobs create http --flags-file="${flags_file}" "${job_name}" "${common_args[@]}" "--attempt-deadline=180s" --format=none
fi
