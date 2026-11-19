#!/usr/bin/env bash
# Gate: the `runner-bundle` stage of apps/accounting/Dockerfile must build, and the
# image must hold /app/dist/intake-runner.mjs.
#
# Why: CD run 43354641728 (Cloud Build 56421307-2abb-48f1-af64-2bab3bc989a7) failed in
# step 0. esbuild could not resolve "@reading-advantage/backend/accounting",
# "@reading-advantage/db/accounting/runtime", and "@reading-advantage/storage", because
# the stage `runner-bundle` starts FROM the stage `deps`. The stage `deps` has no package
# `dist` folder. Only the stage `builder` runs `pnpm turbo run build --filter=accounting`.
#
# MANUAL CHECK, not a gate on this machine: one run needs more than 1800 s (the p2 heavy-run cap)
# and about 4.7 GB of disk. The CD build of the accounting image is the integration proof.
#
# Run it from the repository root, through heavy-run on this machine:
#   HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh \
#     -c 'bash apps/accounting/__tests__/dockerfile-runner-bundle-build.sh'
#
# Exit codes: 0 pass, 1 fail (build error or file missing), 2 not run (free disk too low).
# The script builds with one fixed tag. An EXIT trap removes that image and its own container,
# then runs `podman builder prune -f` (this removes the dangling layers of the build).
#
# Disk use: the floor is 9 GB free on the repository filesystem. The script prints
# runner_bundle_peak_disk_use_kb (the largest drop of free disk that a 15 s sampler saw during
# the build) and runner_bundle_disk_use_after_kb (the drop of free disk after the cleanup).
# Measured by earlier runs of this script before the cleanup existed: 3 runs (2 failed in
# `pnpm install`, 1 stopped by heavy-run at 1800 s) left about 6 GB of dangling layers
# (free disk 11 GB to 5.2 GB). A run killed by heavy-run at 1800 s, while `pnpm install` still
# ran in the stage `deps`, held 4.67 GB in one build container (free disk 10.05 GB to 5.2 GB).
# The build container stays when a build is killed, so the trap also removes the buildah working
# containers that appeared during the build. Peak of one complete run: not measured yet.
set -uo pipefail

MIN_FREE_KB=$((9 * 1024 * 1024))
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TAG="localhost/accounting-runner-bundle-gate:test"
CONTAINER="accounting-runner-bundle-gate-$$"
BUILD_LOG="$(mktemp -t accounting-runner-bundle-gate.XXXXXX.log)"

SAMPLER_PID=""
BEFORE_IDS="$(podman ps -a --external --format '{{.ID}} {{.Names}}' 2>/dev/null | awk '/working-container/ {print $1}' | sort)"
PEAK_FILE="$(mktemp -t accounting-runner-bundle-gate-peak.XXXXXX)"

cleanup() {
  [ -n "$SAMPLER_PID" ] && kill "$SAMPLER_PID" >/dev/null 2>&1
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  AFTER_IDS="$(podman ps -a --external --format '{{.ID}} {{.Names}}' 2>/dev/null | awk '/working-container/ {print $1}' | sort)"
  for ID in $(comm -13 <(echo "$BEFORE_IDS") <(echo "$AFTER_IDS")); do
    podman rm -f "$ID" >/dev/null 2>&1 || true
  done
  podman rmi -f "$TAG" >/dev/null 2>&1 || true
  podman builder prune -f >/dev/null 2>&1 || true
  if [ -n "${FREE_KB:-}" ]; then
    AFTER_KB="$(df -Pk "$REPO_ROOT" | awk 'NR==2 {print $4}')"
    echo "runner_bundle_disk_use_after_kb=$((FREE_KB - AFTER_KB))"
  fi
  rm -f "$BUILD_LOG" "$PEAK_FILE"
}
trap cleanup EXIT
trap 'exit 143' TERM INT

cd "$REPO_ROOT" || exit 1

echo "=== free disk ==="
FREE_KB="$(df -Pk "$REPO_ROOT" | awk 'NR==2 {print $4}')"
echo "runner_bundle_free_disk_kb=${FREE_KB}"
if [ "${FREE_KB:-0}" -lt "$MIN_FREE_KB" ]; then
  echo "runner_bundle_gate_status=not_run_low_disk (need ${MIN_FREE_KB} KB, have ${FREE_KB:-0} KB)"
  exit 2
fi

echo "=== build the runner-bundle stage ==="
echo 0 >"$PEAK_FILE"
(
  while sleep 15; do
    NOW_KB="$(df -Pk "$REPO_ROOT" | awk 'NR==2 {print $4}')"
    DROP=$((FREE_KB - NOW_KB))
    [ "$DROP" -gt "$(cat "$PEAK_FILE")" ] && echo "$DROP" >"$PEAK_FILE"
  done
) &
SAMPLER_PID=$!
START="$(date +%s)"
# pnpm 11 reads the env names pnpm_config_* (checked with `pnpm config get`; it ignores
# npm_config_*). The long fetch values keep `pnpm install` alive on a slow registry link.
docker build --layers=false \
  --env pnpm_config_fetch_timeout=600000 \
  --env pnpm_config_fetch_retries=5 \
  --env pnpm_config_fetch_retry_mintimeout=20000 \
  --env pnpm_config_fetch_retry_maxtimeout=120000 \
  -f apps/accounting/Dockerfile --target runner-bundle -t "$TAG" . >"$BUILD_LOG" 2>&1
BUILD_EXIT=$?
END="$(date +%s)"
tail -n 40 "$BUILD_LOG"
echo "runner_bundle_build_exit=${BUILD_EXIT}"
echo "runner_bundle_build_seconds=$((END - START))"
kill "$SAMPLER_PID" >/dev/null 2>&1
SAMPLER_PID=""
echo "runner_bundle_peak_disk_use_kb=$(cat "$PEAK_FILE")"
ERROR_LINE="$(grep -m1 -E 'Could not resolve|ERROR|Error:|TimeoutError' "$BUILD_LOG" || true)"
echo "runner_bundle_error_line=${ERROR_LINE:-none}"

echo "=== the bundle file is in the image ==="
FILE_PRESENT=0
if [ "$BUILD_EXIT" -eq 0 ]; then
  if docker run --rm --name "$CONTAINER" "$TAG" test -s /app/dist/intake-runner.mjs; then
    FILE_PRESENT=1
  fi
fi
echo "runner_bundle_file_present=${FILE_PRESENT}"

if [ "$BUILD_EXIT" -ne 0 ] || [ "$FILE_PRESENT" -ne 1 ]; then
  echo "=== Total: 2 checks (PASS=$(( (BUILD_EXIT == 0) + FILE_PRESENT )), FAIL=$(( (BUILD_EXIT != 0) + (1 - FILE_PRESENT) ))) ==="
  exit 1
fi
echo "=== Total: 2 checks (PASS=2, FAIL=0) ==="
exit 0
