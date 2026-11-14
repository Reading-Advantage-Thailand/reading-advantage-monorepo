#!/bin/bash
# Submits the review build of the Storytime app (plan task 6.2 round 8; archive upload, task 7.12).
#
# Usage: submit-review-build.sh [commit]
#
# It archives COMMIT (default HEAD) into a fresh temporary folder, so the upload is the committed
# tree only: no untracked, no gitignored, and no uncommitted file can enter the upload. It runs
# one build submit from that folder, with the review ignore file (apps/storytime/review.gcloudignore)
# and the review build config (apps/storytime/cloudbuild-review.yaml). The build makes and pushes
# the image only. The deploy of the pushed image with no traffic and a revision tag is a separate
# step on Daniel's go; this script does not deploy and does not move traffic.

set -euo pipefail

commit="${1:-HEAD}"

# The archive covers the whole repository, so a run from a subfolder still uploads the full tree.
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

# A fresh folder under TMPDIR; the trap removes it on every exit path, also on a gcloud failure.
# The folder is made absolute before the trap and the cd: with a relative TMPDIR the result of
# `mktemp -d` is relative, and the trap would run from another folder after the cd.
work="$(cd "$(mktemp -d)" && pwd -P)"
trap 'rm -rf "$work"' EXIT

git archive "$commit" | tar -x -C "$work"
cd "$work"

gcloud builds submit \
  --ignore-file=apps/storytime/review.gcloudignore \
  --config=apps/storytime/cloudbuild-review.yaml \
  --project=primary-advantage \
  --region=asia-southeast1 \
  .
