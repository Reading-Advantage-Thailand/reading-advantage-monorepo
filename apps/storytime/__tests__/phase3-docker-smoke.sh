#!/usr/bin/env bash
set -uo pipefail

# The Phase 3 form of the Docker smoke (test strategy P3.4 closeout item 3).
# The image is built once and runs three checks.
# Run 1 (production content): a draft week answers 404 with the reason draft, the
# image lists the received weeks w01 to w08, and the shipped w01 answers with its
# true state (ready at the pin 67be5603, so HTTP 200).
# Run 1b (a broken clone mounted): a published week with a page picture without a
# file answers 404 with the reason missing_picture. The strategy names this reason
# for st2/1; the shipped w01 grew page picture files at the w01 approval take, so
# the clone carries the not-ready state (task 3.7 evidence, 2026-11-05).
# Run 2 (the ready review fixture mounted, P3.7): the week page answers HTTP 200
# with the noindex header and no Set-Cookie header.
# The runs together are the final form of AC-1.4.
# Without --locked the script re-enters through heavy-run.sh (PM 2026-10-26), as
# phase1-docker-smoke.sh does. Callers run the script plain, with no flock.
if [ "${1:-}" != "--locked" ]; then
  exec bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/apps/storytime"
IMAGE="storytime-phase1-local:$(git -C "$ROOT" rev-parse --short HEAD)"
BUILT=0
C1=""; C2=""; C3=""
TMP_DIR="$(mktemp -d -t storytime-p3smoke-XXXXXX)"
FIXTURE="$TMP_DIR/content"
BROKEN="$TMP_DIR/broken"

# shellcheck source=phase1-smoke-cleanup.sh
source "$SCRIPT_DIR/phase1-smoke-cleanup.sh"
require_heavy_lock || exit 64
echo "=== Run mode: locked (heavy-run.sh) ==="
(umask 077 && mkdir -p "$SMOKE_STORE_ROOT" "$SMOKE_STORE_RUNROOT")
printf 'locked\t%s\t%s\n' "$(date -u +%FT%TZ)" "$IMAGE" >> "$SMOKE_STORE_ROOT/run-mode.log"
echo "=== Smoke container store: $SMOKE_STORE_ROOT ==="

cleanup() {
  for c in "$C1" "$C2" "$C3"; do
    [ -n "$c" ] && "${SMOKE_PODMAN[@]}" rm -f "$c" >/dev/null 2>&1
  done
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

wait_ready() {
  local port="$1" status="" tries=0
  while [ "$tries" -lt 90 ]; do
    status="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://$port/th/st/2/1" 2>/dev/null)" || true
    [ "$status" != "000" ] && { printf '%s' "$status"; return 0; }
    sleep 1; tries=$((tries + 1))
  done
  printf '000'; return 1
}

echo "=== AC-1.4 Dockerfile exists ==="
if [ -f "$APP/Dockerfile" ]; then
  pass "Storytime Dockerfile exists"
else
  fail "Missing apps/storytime/Dockerfile"
fi

echo "=== AC-1.4 image builds from the monorepo root ==="
BUILD_RC=0
if [ "$FAILED" -eq 0 ]; then
  # The limit and the private store follow phase1-docker-smoke.sh.
  DOCKERFILE="$APP/Dockerfile"
  timeout 45m "${SMOKE_PODMAN[@]}" build --force-rm --network=host -f "$DOCKERFILE" -t "$IMAGE" "$ROOT"
  BUILD_RC=$?
  if [ "$BUILD_RC" -ne 0 ]; then remove_build_containers; fi
  if [ "$BUILD_RC" -eq 0 ]; then
    pass "The local image builds"
    BUILT=1
  elif [ "$BUILD_RC" -eq 124 ]; then
    fail "DOCKER SMOKE FAIL: the build hit the 45m time limit"
  else
    fail "The local image cannot build (exit $BUILD_RC)"
  fi
else
  fail "The local image cannot build"
fi

echo "=== Run 1 (production content): a draft week answers 404 with the reason draft ==="
if [ "$BUILT" -eq 1 ]; then
  C1="$("${SMOKE_PODMAN[@]}" run --detach --publish 127.0.0.1::8080 "$IMAGE")" || fail "The container cannot start"
fi
if [ -n "$C1" ]; then
  PORT1="$("${SMOKE_PODMAN[@]}" port "$C1" 8080/tcp | head -n 1)"
  wait_ready "$PORT1" >/dev/null 2>&1 || true
  STATUS_D="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://$PORT1/th/st/2/2")" || true
  if [ "$STATUS_D" = "404" ]; then
    pass "The draft week returns HTTP 404"
  else
    fail "Expected HTTP 404 for the draft week; got $STATUS_D"
  fi
  if "${SMOKE_PODMAN[@]}" logs "$C1" 2>&1 | grep -q "st2/2 blocked: draft"; then
    pass "The container log names draft for st2/2"
  else
    fail "The container log does not name draft for st2/2"
  fi
  STATUS_R="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://$PORT1/th/st/2/1")" || true
  if [ "$STATUS_R" = "200" ]; then
    pass "The shipped w01 answers HTTP 200 (ready at the pin 67be5603)"
  else
    fail "Expected HTTP 200 for the shipped w01; got $STATUS_R"
  fi
else
  fail "No container serves the production content"
fi

echo "=== Run 1 (production content): the image holds the received weeks w01 to w08 ==="
if [ "$BUILT" -eq 1 ]; then
  LISTING="$("${SMOKE_PODMAN[@]}" run --rm --entrypoint sh "$IMAGE" -c 'ls apps/storytime/content/l2' 2>/dev/null)" || LISTING=""
  WEEKS_OK=1
  for n in 1 2 3 4 5 6 7 8; do
    w="w$(printf '%02d' "$n").json"
    printf '%s\n' "$LISTING" | grep -qx "$w" || WEEKS_OK=0
  done
  if [ "$WEEKS_OK" -eq 1 ]; then
    pass "The image lists w01 to w08"
  else
    fail "The image content listing misses a week: $LISTING"
  fi
fi

echo "=== Create the broken clone (page picture files removed) for the missing_picture reason ==="
BROKEN_RC=1
if [ -f "$APP/content/l2/w01.json" ]; then
  mkdir -p "$BROKEN/l2"
  node --input-type=module - "$APP/content/l2/w01.json" "$BROKEN/l2/w01.json" <<'NODE'
import fs from 'node:fs';
const [source, target] = process.argv.slice(2);
const week = JSON.parse(fs.readFileSync(source, 'utf8'));
for (const book of week.books ?? []) {
  for (const page of book.pages ?? []) {
    if (page.image && typeof page.image === 'object') delete page.image.file;
  }
}
fs.writeFileSync(target, JSON.stringify(week));
NODE
  BROKEN_RC=$?
fi
if [ "$BROKEN_RC" -eq 0 ]; then
  pass "The broken clone holds shipped w01 without page picture files"
else
  fail "Could not create the broken clone"
fi

echo "=== Run 1b (broken clone mounted): the route answers 404 with the reason missing_picture ==="
if [ "$BUILT" -eq 1 ] && [ "$BROKEN_RC" -eq 0 ]; then
  C3="$("${SMOKE_PODMAN[@]}" run --detach --publish 127.0.0.1::8080 --volume "$BROKEN:/fixture:ro" --env STORYTIME_CONTENT_DIR=/fixture "$IMAGE")" || fail "The broken-clone container cannot start"
fi
if [ -n "$C3" ]; then
  PORT3="$("${SMOKE_PODMAN[@]}" port "$C3" 8080/tcp | head -n 1)"
  STATUS_B="$(wait_ready "$PORT3")" || true
  if [ "$STATUS_B" = "404" ]; then
    pass "The broken clone returns HTTP 404"
  else
    fail "Expected HTTP 404 for the broken clone; got $STATUS_B"
  fi
  if "${SMOKE_PODMAN[@]}" logs "$C3" 2>&1 | grep -q "st2/1 blocked: missing_picture"; then
    pass "The container log names missing_picture for st2/1"
  else
    fail "The container log does not name missing_picture for st2/1"
  fi
else
  fail "No container serves the broken clone"
fi

echo "=== Create the ready review fixture from shipped w01 (P3.7) ==="
FIXTURE_RC=1
if [ -f "$APP/content/l2/w01.json" ]; then
  mkdir -p "$FIXTURE/l2"
  node --input-type=module - "$APP/content/l2/w01.json" "$FIXTURE/l2/w01.json" "$FIXTURE" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [source, target, root] = process.argv.slice(2);
const week = JSON.parse(fs.readFileSync(source, 'utf8'));
for (const part of ['images', 'audio', 'song']) {
  week.approval[part] = { ...week.approval[part], status: 'approved' };
}
const media = new Set();
function collect(value) {
  if (Array.isArray(value)) return value.forEach(collect);
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'file' && typeof item === 'string') media.add(item);
    else collect(item);
  }
}
collect(week);
for (const name of media) {
  const file = path.resolve(root, name);
  if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`unsafe fixture path: ${name}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, name.endsWith('.mp3') ? Buffer.from('ID3') : Buffer.from('fixture'));
}
fs.writeFileSync(target, JSON.stringify(week));
NODE
  FIXTURE_RC=$?
fi
if [ "$FIXTURE_RC" -eq 0 ]; then
  pass "The ready review fixture holds shipped w01 with approvals and placeholder media"
else
  fail "Could not create the ready review fixture"
fi

echo "=== Run 2 (ready review fixture mounted): the week page renders with noindex and no Set-Cookie ==="
if [ "$BUILT" -eq 1 ] && [ "$FIXTURE_RC" -eq 0 ]; then
  C2="$("${SMOKE_PODMAN[@]}" run --detach --publish 127.0.0.1::8080 --volume "$FIXTURE:/fixture:ro" --env STORYTIME_CONTENT_DIR=/fixture "$IMAGE")" || fail "The fixture container cannot start"
fi
if [ -n "$C2" ]; then
  PORT2="$("${SMOKE_PODMAN[@]}" port "$C2" 8080/tcp | head -n 1)"
  STATUS2="$(wait_ready "$PORT2")" || true
  if [ "$STATUS2" = "200" ]; then
    pass "The printed route returns HTTP 200 with the fixture"
  else
    fail "Expected HTTP 200 with the fixture; got $STATUS2"
  fi
  BODY="$(curl --silent "http://$PORT2/th/st/2/1")"
  ROBOTS_META="$(printf '%s' "$BODY" | grep -oi '<meta[^>]*name="robots"[^>]*>' | head -n 1)"
  if printf '%s' "$ROBOTS_META" | grep -qi "noindex"; then
    pass "The week page metadata holds noindex"
  else
    fail "The week page metadata misses noindex"
  fi
  HEADERS="$(curl --silent --head "http://$PORT2/th/st/2/1")"
  if printf '%s\n' "$HEADERS" | grep -qi "^set-cookie:"; then
    fail "The week page sends a Set-Cookie header"
  else
    pass "The week page sends no Set-Cookie header"
  fi
else
  fail "No container serves the fixture"
fi

echo "=== Cleanup: remove the containers and every storytime smoke image ==="
for c in "$C1" "$C2" "$C3"; do
  [ -n "$c" ] && "${SMOKE_PODMAN[@]}" rm -f "$c" >/dev/null 2>&1
done
C1=""; C2=""; C3=""
# Task 3.7 leaves no image behind (orchestrator rule). The prune helper removes
# the older tags; the current tag is removed here, on the passing and the
# failing path.
prune_old_image_tags "$IMAGE"
"${SMOKE_PODMAN[@]}" rmi "$IMAGE" >/dev/null 2>&1 || true
LEFT="$("${SMOKE_PODMAN[@]}" images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -c "storytime-phase1-local:" || true)"
if [ "$LEFT" -eq 0 ]; then
  pass "No storytime smoke image stays behind"
else
  fail "A storytime smoke image stays behind"
fi

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
