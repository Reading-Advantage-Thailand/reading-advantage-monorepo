#!/bin/bash
# Submits the review build of the Storytime app (plan task 6.2, round 8).
#
# It runs one build submit from the monorepo root, with the review ignore file
# (apps/storytime/review.gcloudignore) and the review build config
# (apps/storytime/cloudbuild-review.yaml). The build makes and pushes the image only.
# The deploy of the pushed image with no traffic and a revision tag is a separate step on
# Daniel's go; this script does not deploy and does not move traffic.

set -euo pipefail

# The submit must run from the monorepo root, so the relative paths stay correct from any folder.
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

gcloud builds submit \
  --ignore-file=apps/storytime/review.gcloudignore \
  --config=apps/storytime/cloudbuild-review.yaml \
  --project=primary-advantage \
  --region=asia-southeast1 \
  .
