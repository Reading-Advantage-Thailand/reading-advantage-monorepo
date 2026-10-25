#!/usr/bin/env bash
set -uo pipefail

# Run this local image check separately from Vitest and Turbo.
# Phase 1 serves 404. Phase 3 replaces this check with the week page check.
if [ "${1:-}" != "--locked" ]; then
  exec flock "$HOME/Desktop/primary-parity-progress/heavy.lock" bash "$0" --locked
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
IMAGE="storytime-phase1-local:$(git -C "$ROOT" rev-parse --short HEAD)"
CONTAINER=""
cleanup() { if [ -n "$CONTAINER" ]; then docker rm -f "$CONTAINER" >/dev/null; fi; }
trap cleanup EXIT

echo "=== AC-1.4 Dockerfile exists ==="
if [ -f "$ROOT/apps/storytime/Dockerfile" ]; then
  pass "Storytime Dockerfile exists"
else
  fail "Missing apps/storytime/Dockerfile"
fi

echo "=== AC-1.4 image builds from the monorepo root ==="
if [ "$FAILED" -eq 0 ] && docker build -f "$ROOT/apps/storytime/Dockerfile" -t "$IMAGE" "$ROOT"; then
  pass "The local image builds"
else
  fail "The local image cannot build"
fi

echo "=== Phase 1 container answers the printed route with HTTP 404 ==="
if [ "$FAILED" -eq 0 ]; then
  CONTAINER="$(docker run --detach --publish 127.0.0.1::8080 "$IMAGE")" || fail "The container cannot start"
fi
if [ -n "$CONTAINER" ]; then
  PORT="$(docker port "$CONTAINER" 8080/tcp | head -n 1)"
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
