#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Cloud Build must provide PROJECT_ID}"
: "${CODECAMP_REVIEW_WORKER_TICK_TOKEN:?Cloud Build must provide the scheduler bearer token from Secret Manager}"

readonly job_name="codecamp-review-worker-tick"
readonly location="${REVIEW_WORKER_SCHEDULER_LOCATION:-asia-southeast1}"
readonly schedule="*/2 * * * *"
readonly uri="https://codecamp.reading-advantage.com/api/internal/review-worker-tick"
readonly authorization_header="Authorization=Bearer ${CODECAMP_REVIEW_WORKER_TICK_TOKEN}"
# The Cloud Build service account must have roles/cloudscheduler.admin (or
# equivalent create/update permission) in the Codecamp project before this step runs.

common_args=(
  "--project=${PROJECT_ID}"
  "--location=${location}"
  "--schedule=${schedule}"
  "--uri=${uri}"
  "--http-method=POST"
  "--time-zone=Etc/UTC"
)

if gcloud scheduler jobs describe "${job_name}" --project="${PROJECT_ID}" --location="${location}" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "${job_name}" "${common_args[@]}" "--update-headers=${authorization_header}"
else
  gcloud scheduler jobs create http "${job_name}" "${common_args[@]}" "--headers=${authorization_header}"
fi
