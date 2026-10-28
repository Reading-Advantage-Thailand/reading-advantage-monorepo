#!/usr/bin/env bash
set -uo pipefail

# Run this local image check separately from Vitest and Turbo.
# Phase 1 serves 404. Phase 3 replaces this check with the week page check.
# Without --locked the script re-enters through heavy-run.sh (PM 2026-10-26), which takes
# the heavy lock and runs the pre-flight. Callers run the script plain, with no flock.
if [ "${1:-}" != "--locked" ]; then
  exec bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE="storytime-phase1-local:$(git -C "$ROOT" rev-parse --short HEAD)"
CONTAINER=""
# PM 2026-10-27 15:32: a stopped image build leaves its buildah working containers behind,
# and podman --force-rm does not remove them after the timeout kill.
# Review B r2 (2026-10-28): the build, the run, and the cleanup use a container store that
# only this smoke writes. The heavy lock is the first guard against concurrent builds; the
# private store is the second. The cleanup therefore removes working containers in this
# store only and never touches the shared default store.
# shellcheck source=phase1-smoke-cleanup.sh
source "$SCRIPT_DIR/phase1-smoke-cleanup.sh"
# The store path is fixed and outside the repository, so a run reuses the store of the
# previous run. Only this smoke writes it.
(umask 077 && mkdir -p "$SMOKE_STORE_ROOT" "$SMOKE_STORE_RUNROOT")
echo "=== Smoke container store: $SMOKE_STORE_ROOT ==="
cleanup() {
  if [ -n "$CONTAINER" ]; then "${SMOKE_PODMAN[@]}" rm -f "$CONTAINER" >/dev/null; fi
}
trap cleanup EXIT

echo "=== AC-1.4 Dockerfile exists ==="
if [ -f "$ROOT/apps/storytime/Dockerfile" ]; then
  pass "Storytime Dockerfile exists"
else
  fail "Missing apps/storytime/Dockerfile"
fi

echo "=== AC-1.4 image builds from the monorepo root ==="
# PM 2026-10-26: the local build gets a time limit, so a stuck fetch cannot hold the lock
# without bound. The 2026-10-25 run spent its time inside the container pnpm install.
# Review B r2 (2026-10-28): the first run against a new store is cold, so the limit is 45
# minutes. Later runs reuse the store and the cache mounts, and finish in about 8 minutes.
BUILD_RC=0
if [ "$FAILED" -eq 0 ]; then
  # PM 2026-10-26: the local build uses the host network; the container network
  # path failed DNS (EAI_AGAIN). Cloud Build does not use this script.
  DOCKERFILE="$ROOT/apps/storytime/Dockerfile"
  timeout 45m "${SMOKE_PODMAN[@]}" build --force-rm --network=host -f "$DOCKERFILE" -t "$IMAGE" "$ROOT"
  BUILD_RC=$?
  if [ "$BUILD_RC" -ne 0 ]; then remove_build_containers; fi
  if [ "$BUILD_RC" -eq 0 ]; then
    pass "The local image builds"
  elif [ "$BUILD_RC" -eq 124 ]; then
    echo "DOCKER SMOKE FAIL: the build hit the 45m time limit"
    fail "DOCKER SMOKE FAIL: the build hit the 45m time limit"
  else
    fail "The local image cannot build (exit $BUILD_RC)"
  fi
else
  fail "The local image cannot build"
fi

echo "=== Phase 1 container answers the printed route with HTTP 404 ==="
if [ "$FAILED" -eq 0 ]; then
  CONTAINER="$("${SMOKE_PODMAN[@]}" run --detach --publish 127.0.0.1::8080 "$IMAGE")" || fail "The container cannot start"
fi
if [ -n "$CONTAINER" ]; then
  PORT="$("${SMOKE_PODMAN[@]}" port "$CONTAINER" 8080/tcp | head -n 1)"
  STATUS=""
  for _ in $(seq 1 60); do
    STATUS="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://$PORT/th/st/2/1")" || true
    if [ "$STATUS" != "000" ]; then break; fi
    sleep 1
  done
  if [ "$STATUS" = "404" ]; then pass "The printed route returns HTTP 404"; else fail "Expected HTTP 404; got $STATUS"; fi
else
  fail "No container serves the printed route"
fi

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
