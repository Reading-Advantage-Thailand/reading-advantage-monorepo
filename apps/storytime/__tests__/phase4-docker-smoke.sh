#!/usr/bin/env bash
set -uo pipefail

# The Phase 4 Docker smoke of the teacher routes (test strategy P4 closeout item 3, task 4.5).
#
# The image builds once from the monorepo root, and one container runs with no
# STORYTIME_TEACHER_ROUTES value in its environment at all, so the default proves itself. Every
# teacher route answers 404 from the container, with the locale segment and without it. The
# pattern follows phase3-docker-smoke.sh and its sign-in: the auth middleware answers a stranger
# with the sign-in redirect, so the rows carry the session cookie of the teacher account
# teach-01 in a throwaway Postgres. The flag check answers 404 before any content read. The
# password stays in a shell value and no log line prints it. The port is free and never 3005 and
# never 3099. The containers stop by their names in the exit trap. The caller runs this script
# through heavy-run.sh, and this script prints one row per route.

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
IMAGE="storytime-phase1-local:$(git -C "$ROOT" rev-parse --short HEAD)"
C1=""
DB_CONTAINER="storytime-p4smoke-db-$$"
DB_URL=""
COOKIE=""
TMP_DIR="$(mktemp -d -t storytime-p4smoke-XXXXXX)"

cleanup() {
  [ -n "$C1" ] && podman rm -f "$C1" >/dev/null 2>&1
  podman rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

free_port() {
  node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();});'
}

echo "=== The image builds from the monorepo root ==="
BUILD_RC=0
timeout 45m podman build --force-rm --network=host -f "$APP/Dockerfile" -t "$IMAGE" "$ROOT"
BUILD_RC=$?
if [ "$BUILD_RC" -eq 0 ]; then
  pass "The local image builds"
else
  fail "The local image cannot build (exit $BUILD_RC)"
fi

echo "=== Start the local database, migrate it, and make the account teach-01 (teacher) ==="
DB_READY=0
DB_PORT="$(free_port)"
if podman run -d --name "$DB_CONTAINER" -p "127.0.0.1:$DB_PORT:5432" \
  -e POSTGRES_PASSWORD=storytime -e POSTGRES_DB=storytime \
  docker.io/library/postgres:16-alpine >/dev/null 2>&1; then
  for _ in $(seq 1 60); do
    if podman exec "$DB_CONTAINER" pg_isready -U postgres -d storytime >/dev/null 2>&1; then DB_READY=1; break; fi
    sleep 1
  done
  DB_URL="postgres://postgres:storytime@127.0.0.1:$DB_PORT/storytime"
else
  fail "The local database container does not start"
fi
SEED_OK=0
TEACHER_PASSWORD=""
if [ "$DB_READY" -eq 1 ]; then
  mkdir -p "$TMP_DIR/accounts"
  printf 'name,class,role\nTeacher One,teach,teacher\n' > "$TMP_DIR/accounts/accounts.csv"
  if (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" pnpm --filter @reading-advantage/db storytime:migrate >"$TMP_DIR/migrate.log" 2>&1) \
    && (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" ./node_modules/.bin/tsx apps/storytime/scripts/make-accounts.ts --folder "$TMP_DIR/accounts" --database-url-env STORYTIME_DATABASE_URL >"$TMP_DIR/accounts.log" 2>&1) \
    && [ -s "$TMP_DIR/accounts/sign-in-cards.csv" ]; then
    SEED_OK=1
    TEACHER_PASSWORD="$(awk -F, '$1=="teach-01" { print $NF }' "$TMP_DIR/accounts/sign-in-cards.csv" | tr -d '\r')"
    pass "The database holds the account teach-01"
  else
    fail "The migration or the account script fails"
  fi
else
  fail "The local database does not answer"
fi

PORT=""
if [ "$SEED_OK" -eq 1 ]; then
  PORT="$(free_port)"
  while [ "$PORT" = "3005" ] || [ "$PORT" = "3099" ]; do PORT="$(free_port)"; done
  # No STORYTIME_TEACHER_ROUTES name enters the environment of the container, so the default
  # value of the flag proves itself.
  C1="$(podman run --detach --network=host --env "PORT=$PORT" --env HOSTNAME=127.0.0.1 \
    --env "STORYTIME_DATABASE_URL=$DB_URL" --env STORYTIME_MEDIA_BASE=gs://storytime-app-media \
    "$IMAGE")" || C1=""
  if [ -n "$C1" ]; then
    pass "The container starts on port $PORT"
  else
    fail "The container cannot start"
  fi
fi

READY=""
if [ -n "$C1" ]; then
  tries=0
  while [ "$tries" -lt 90 ]; do
    status="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:$PORT/th/join" 2>/dev/null)" || true
    [ "$status" != "000" ] && { READY=1; break; }
    sleep 1; tries=$((tries + 1))
  done
  if [ -n "$READY" ]; then
    pass "The container answers on port $PORT"
  else
    fail "The container never answers on port $PORT"
  fi
fi

if [ -n "$READY" ]; then
  # The session cookie of teach-01. The own origin comes from the Host header, as in the Phase 3
  # smoke (finding F-origin).
  headers="$(curl --silent --show-error -D - -o /dev/null -X POST \
    -H "Origin: http://127.0.0.1:$PORT" \
    --data-urlencode "username=teach-01" --data-urlencode "password=$TEACHER_PASSWORD" \
    --data-urlencode "locale=th" --data-urlencode "next=/th/st" \
    "http://127.0.0.1:$PORT/api/auth/sign-in")" || headers=""
  COOKIE="$(printf '%s\n' "$headers" | tr -d '\r' | sed -n 's/^[Ss]et-[Cc]ookie: \(__Host-st_session=[^;]*\).*/\1/p' | head -n 1)"
  if [ -n "$COOKIE" ]; then
    pass "The teacher session signs in"
  else
    fail "The teacher session does not sign in"
  fi
fi

if [ -n "$COOKIE" ]; then
  echo "=== Every teacher route answers 404 with the flag not set ==="
  TOTAL=0; OK404=0
  check_route() {
    local path="$1" status
    status="$(curl --silent --location --output /dev/null --write-out '%{http_code}' -H "Cookie: $COOKIE" "http://127.0.0.1:$PORT$path" 2>/dev/null)" || true
    TOTAL=$((TOTAL + 1))
    if [ "$status" = "404" ]; then
      OK404=$((OK404 + 1))
    else
      fail "The teacher route $path answered $status, not 404"
    fi
    printf 'flag_off_route=%s status=%s\n' "$path" "$status"
  }
  check_route "/th/teacher/2/1"
  check_route "/en/teacher/2/1"
  check_route "/teacher/2/1"
  for day in 1 2 3 4 5; do
    check_route "/th/teacher/2/1/$day"
    check_route "/teacher/2/1/$day"
  done
  if [ "$OK404" -eq "$TOTAL" ]; then
    pass "Every teacher route answers 404 from the container (teacher_404=$OK404 of $TOTAL)"
  else
    fail "Some teacher routes did not answer 404 (teacher_404=$OK404 of $TOTAL)"
  fi
fi

for row in "${RESULTS[@]}"; do echo "$row"; done
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
