#!/usr/bin/env bash
set -uo pipefail

# The Phase 3 form of the Docker smoke (test strategy P3.4 closeout item 3).
# The image is built once and runs three checks.
# Run 1 (production content): a draft week answers 404 with the reason draft, the
# image lists the received weeks w01 to w08, and the shipped w01 answers with its
# true state (ready at the pin 82f88853, so HTTP 200).
# Run 1b (a broken clone mounted): a published week with a page picture without a
# file answers 404 with the reason missing_picture. The strategy names this reason
# for st2/1; the shipped w01 grew page picture files at the w01 approval take, so
# the clone carries the not-ready state (task 3.7 evidence, 2026-11-05).
# Run 2 (the ready review fixture mounted, P3.7): the week page answers HTTP 200
# with the noindex header and no Set-Cookie header; the locale redirect and the week 404
# answer with no Set-Cookie header too, and a failed curl fails a no-cookie row
# (findings A4-3 and B4-1).
# The runs together are the final form of AC-1.4.
# Login phase (P2b.11 F7b): the image now holds the sign-in. The script starts a throwaway
# Postgres container (the one of phase2b-browser-gate.sh), migrates it, makes the account
# staff-01 with make-accounts.ts in a temp folder, and signs in with curl. The stranger rows
# read week_stranger_status=307, stranger_set_cookie=0, and join_status=200. The content rows
# run with the session cookie of staff-01. The app containers run on the host network so that
# they reach the database; no password is printed.
# F-origin (Red r6): one row posts a sign-in with `Host: storytime.example.test` and
# `Origin: http://storytime.example.test` and no x-forwarded-proto. The own origin comes from the
# Host header, so the row reads standalone_origin_status=303; request.nextUrl.origin gives 403.
# Run 2 also holds the P3.6 week-404 row: a week outside the shipped range answers 404 with the
# Thai and English lines of app/[locale]/not-found.tsx (PM 2026-11-05: this script does not
# check <html lang>; the live lang check is the browser-gate row).
# --self-test runs the fail-first proof of the podman-exit and GET-header rows with stub
# commands and no build (finding F130), before the lock re-entry; the self-test covers the
# failed-curl and status-line-less cases of the no-cookie row.
# Without --locked the script re-enters through heavy-run.sh (PM 2026-10-26), as
# phase1-docker-smoke.sh does. Callers run the script plain, with no flock.
# The state of the storytime smoke images left behind, from the podman command array. A
# non-zero exit of podman images is its own failing state (finding F130): the old row piped
# into `grep -c ... || true`, so a podman failure printed 0 and passed the row.
left_behind_state() {
  local out
  out="$("${SMOKE_PODMAN[@]}" images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null)"
  if [ $? -ne 0 ]; then printf 'podman-failed\n'; return 0; fi
  if printf '%s\n' "$out" | grep -q "storytime-phase1-local:"; then printf 'left-behind\n'; return 0; fi
  printf 'clean\n'
}
# The headers of one GET request (finding F130: the old row read a HEAD request, while the
# body checks of the same page read GET responses).
# An optional second argument is the Cookie header value of a signed-in session.
week_page_headers() { curl --silent --show-error -D - -o /dev/null ${2:+-H "Cookie: $2"} "$1"; }
# True when the headers hold a Set-Cookie field.
headers_hold_cookie() { printf '%s\n' "$1" | grep -qi '^set-cookie:'; }

# The headers of one GET with a fetch check (findings A4-3 and B4-1): a failed curl or an
# answer without a status line must fail a no-cookie row, not pass it. Sets WEEK_HEADERS to
# the header text and WEEK_HEADERS_RC to the curl exit code; returns non-zero on a failed
# fetch.
week_page_headers_checked() {
  WEEK_HEADERS_RC=0
  WEEK_HEADERS="$(week_page_headers "$1" "${2:-}")" || WEEK_HEADERS_RC=$?
  if [ "$WEEK_HEADERS_RC" -ne 0 ] || ! printf '%s\n' "$WEEK_HEADERS" | grep -q '^HTTP/'; then
    return 1
  fi
}

# The no-cookie row decision (findings A4-3 and B4-1): the row passes only when the fetch
# succeeded and the headers hold no Set-Cookie line.
week_no_cookie_ok() {
  week_page_headers_checked "$1" "${2:-}" || return 1
  ! headers_hold_cookie "$WEEK_HEADERS"
}

if [ "${1:-}" = "--self-test" ]; then
  SELFTEST_FAILED=0
  STUB_DIR="$(mktemp -d -t storytime-p3smoke-stub-XXXXXX)"
  trap 'rm -rf "$STUB_DIR"' EXIT
  printf '#!/usr/bin/env bash\nexit 1\n' > "$STUB_DIR/podman-fail"
  chmod +x "$STUB_DIR/podman-fail"
  printf '#!/usr/bin/env bash\necho "storytime-phase1-local:deadbee"\nexit 0\n' > "$STUB_DIR/podman-left"
  chmod +x "$STUB_DIR/podman-left"
  printf '#!/usr/bin/env bash\ncat "$STUB_HDRS"\n' > "$STUB_DIR/curl"
  chmod +x "$STUB_DIR/curl"
  printf 'HTTP/1.1 200 OK\r\nSet-Cookie: session=1\r\n\r\n' > "$STUB_DIR/with-cookie.txt"
  printf 'HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n' > "$STUB_DIR/no-cookie.txt"

  SMOKE_PODMAN=("$STUB_DIR/podman-fail")
  STATE="$(left_behind_state)"
  if [ "$STATE" = "podman-failed" ]; then
    echo "SELF-TEST PASS: a podman stub that exits 1 makes the image row fail (podman-failed)"
  else
    echo "SELF-TEST FAIL: a podman stub that exits 1 gave $STATE, not podman-failed"
    SELFTEST_FAILED=1
  fi

  SMOKE_PODMAN=("$STUB_DIR/podman-left")
  STATE="$(left_behind_state)"
  if [ "$STATE" = "left-behind" ]; then
    echo "SELF-TEST PASS: a podman stub that lists a storytime image gives left-behind"
  else
    echo "SELF-TEST FAIL: a listing podman stub gave $STATE, not left-behind"
    SELFTEST_FAILED=1
  fi

  export STUB_HDRS="$STUB_DIR/with-cookie.txt"
  PATH="$STUB_DIR:$PATH"
  export PATH
  HEADERS="$(week_page_headers "http://stub/week")"
  if headers_hold_cookie "$HEADERS"; then
    echo "SELF-TEST PASS: a GET answer with Set-Cookie fails the no-cookie row"
  else
    echo "SELF-TEST FAIL: the Set-Cookie stub answer held no cookie"
    SELFTEST_FAILED=1
  fi
  export STUB_HDRS="$STUB_DIR/no-cookie.txt"
  HEADERS="$(week_page_headers "http://stub/week")"
  if headers_hold_cookie "$HEADERS"; then
    echo "SELF-TEST FAIL: the clean stub answer held a cookie"
    SELFTEST_FAILED=1
  else
    echo "SELF-TEST PASS: a GET answer with no Set-Cookie passes the row"
  fi

  # A failed curl must fail the no-cookie row (findings A4-3 and B4-1); the old row passed
  # vacuously on empty headers (Review A probe: curl_rc=7, headers_len=0).
  FAIL_DIR="$STUB_DIR/fail-curl"
  mkdir -p "$FAIL_DIR"
  printf '#!/usr/bin/env bash\necho "curl: (7) Failed to connect" >&2\nexit 7\n' > "$FAIL_DIR/curl"
  chmod +x "$FAIL_DIR/curl"
  if PATH="$FAIL_DIR:$PATH" week_no_cookie_ok "http://stub/week"; then
    echo "SELF-TEST FAIL: a failed curl left the no-cookie row passing"
    SELFTEST_FAILED=1
  else
    echo "SELF-TEST PASS: a failed curl fails the no-cookie row (curl_rc=$WEEK_HEADERS_RC)"
  fi

  # An answer without a status line must fail the row too.
  NOSTATUS_DIR="$STUB_DIR/no-status"
  mkdir -p "$NOSTATUS_DIR"
  printf '#!/usr/bin/env bash\nprintf "garbage without a status line\\n"\n' > "$NOSTATUS_DIR/curl"
  chmod +x "$NOSTATUS_DIR/curl"
  if PATH="$NOSTATUS_DIR:$PATH" week_no_cookie_ok "http://stub/week"; then
    echo "SELF-TEST FAIL: a status-line-less answer left the no-cookie row passing"
    SELFTEST_FAILED=1
  else
    echo "SELF-TEST PASS: an answer without a status line fails the no-cookie row"
  fi

  # F201: the 404 row reuses the same check, so a Set-Cookie answer to the 404 path must
  # fail the 404 no-cookie row; the status value plays no part in the header decision.
  export STUB_HDRS="$STUB_DIR/with-cookie.txt"
  if week_no_cookie_ok "http://stub/th/st/2/99"; then
    echo "SELF-TEST FAIL: a 404 answer with Set-Cookie left the 404 no-cookie row passing"
    SELFTEST_FAILED=1
  else
    echo "SELF-TEST PASS: a 404 answer with Set-Cookie fails the 404 no-cookie row"
  fi

  if [ "$SELFTEST_FAILED" -eq 0 ]; then
    echo "=== Self-test: PASS ==="
  else
    echo "=== Self-test: FAIL ==="
  fi
  exit "$SELFTEST_FAILED"
fi

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
DB_CONTAINER="storytime-p3smoke-db-$$"
SESSION_COOKIE=""
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
  podman rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

free_port() {
  node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();});'
}

# Starts one app container on the host network with the database and the storage settings of
# the smoke. The storage settings only sign URLs (a local computation); no request leaves.
# $1 is the port; further arguments are podman options. The image is the last argument.
start_app() {
  local port="$1"; shift
  "${SMOKE_PODMAN[@]}" run --detach --network=host --env "PORT=$port" --env HOSTNAME=127.0.0.1 \
    --env "STORYTIME_DATABASE_URL=$DB_URL" --env STORYTIME_MEDIA_BASE=gs://storytime-app-media \
    --env STORYTIME_STORAGE_ACCESS_KEY=smoke-access-key --env STORYTIME_STORAGE_SECRET_KEY=smoke-secret-key \
    "$@" "$IMAGE"
}

# Prints the HTTP status of one GET; an optional second argument is the Cookie header value.
status_of() {
  curl --silent --output /dev/null --write-out '%{http_code}' ${2:+-H "Cookie: $2"} "$1" || true
}

# Signs one account in and prints the name=value pair of the session cookie, or nothing.
# $1 is the port, $2 the username, $3 the password.
# The Origin header is http://127.0.0.1:<port>: the own origin is now read from the Host header
# (green r2 of 2b.7, finding F-origin), and curl sends Host 127.0.0.1:<port>. The old Origin
# http://localhost:<port> matched request.nextUrl.origin, which followed the server HOSTNAME.
sign_in_cookie() {
  local port="$1" headers
  headers="$(curl --silent --show-error -D - -o /dev/null -X POST \
    -H "Origin: http://127.0.0.1:$port" \
    --data-urlencode "username=$2" --data-urlencode "password=$3" \
    --data-urlencode "locale=th" --data-urlencode "next=/th/st" \
    "http://127.0.0.1:$port/api/auth/sign-in")" || return 1
  printf '%s\n' "$headers" | tr -d '\r' | sed -n 's/^[Ss]et-[Cc]ookie: \(__Host-st_session=[^;]*\).*/\1/p' | head -n 1
}

wait_ready() {
  local port="$1" status="" tries=0
  while [ "$tries" -lt 90 ]; do
    status="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://$port/th/join" 2>/dev/null)" || true
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

echo "=== Start the local database, migrate it, and make the account staff-01 (F7b) ==="
DB_URL=""
DB_READY=0
if [ "$BUILT" -eq 1 ]; then
  DB_PORT="$(free_port)"
  if podman run -d --name "$DB_CONTAINER" -p "127.0.0.1:$DB_PORT:5432" \
    -e POSTGRES_PASSWORD=storytime -e POSTGRES_DB=storytime \
    docker.io/library/postgres:16-alpine >/dev/null 2>&1; then
    pass "The local database container starts"
    for _ in $(seq 1 60); do
      if podman exec "$DB_CONTAINER" pg_isready -U postgres -d storytime >/dev/null 2>&1; then DB_READY=1; break; fi
      sleep 1
    done
  else
    fail "The local database container does not start"
  fi
  DB_URL="postgres://postgres:storytime@127.0.0.1:$DB_PORT/storytime"
fi
SEED_OK=0
if [ "$DB_READY" -eq 1 ]; then
  mkdir -p "$TMP_DIR/accounts"
  printf 'name,class,role\nStaff One,staff,family\n' > "$TMP_DIR/accounts/accounts.csv"
  if (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" pnpm --filter @reading-advantage/db storytime:migrate >"$TMP_DIR/migrate.log" 2>&1) \
    && (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" ./node_modules/.bin/tsx apps/storytime/scripts/make-accounts.ts --folder "$TMP_DIR/accounts" --database-url-env STORYTIME_DATABASE_URL >"$TMP_DIR/accounts.log" 2>&1) \
    && [ -s "$TMP_DIR/accounts/sign-in-cards.csv" ]; then
    SEED_OK=1
    pass "The database holds the account staff-01"
  else
    fail "The migration or the account script fails"
  fi
elif [ "$BUILT" -eq 1 ]; then
  fail "The local database does not answer"
fi
STAFF_PASSWORD=""
if [ "$SEED_OK" -eq 1 ]; then
  STAFF_PASSWORD="$(awk -F, '$1=="staff-01" { print $NF }' "$TMP_DIR/accounts/sign-in-cards.csv" | tr -d '\r')"
fi

echo "=== Run 1 (production content): a stranger gets the sign-in; staff-01 reads the weeks ==="
if [ "$BUILT" -eq 1 ] && [ "$SEED_OK" -eq 1 ]; then
  PORT1="$(free_port)"
  C1="$(start_app "$PORT1")" || fail "The container cannot start"
fi
if [ -n "$C1" ]; then
  wait_ready "127.0.0.1:$PORT1" >/dev/null 2>&1 || true
  # F7b: the stranger rows. A week page with no session answers 307 to the sign-in page and
  # sets no cookie; the "How to join" page answers 200 and sets no cookie.
  if week_page_headers_checked "http://127.0.0.1:$PORT1/th/st/2/1"; then
    STRANGER_STATUS="$(printf '%s\n' "$WEEK_HEADERS" | head -n 1 | tr -d '\r' | awk '{print $2}')"
    STRANGER_COOKIE=0; headers_hold_cookie "$WEEK_HEADERS" && STRANGER_COOKIE=1
  else
    STRANGER_STATUS="fetch-failed"; STRANGER_COOKIE=1
  fi
  echo "week_stranger_status=$STRANGER_STATUS"
  echo "stranger_set_cookie=$STRANGER_COOKIE"
  if [ "$STRANGER_STATUS" = "307" ] && printf '%s\n' "$WEEK_HEADERS" | grep -qi '^location: .*/th/sign-in?next='; then
    pass "A stranger gets HTTP 307 to the sign-in page"
  else
    fail "Expected HTTP 307 to the sign-in page for a stranger; got $STRANGER_STATUS"
  fi
  if [ "$STRANGER_COOKIE" -eq 0 ]; then
    pass "The stranger answer sends no Set-Cookie header"
  else
    fail "The stranger answer sends a Set-Cookie header or the fetch failed"
  fi
  JOIN_STATUS="$(status_of "http://127.0.0.1:$PORT1/th/join")"
  echo "join_status=$JOIN_STATUS"
  if [ "$JOIN_STATUS" = "200" ] && week_no_cookie_ok "http://127.0.0.1:$PORT1/th/join"; then
    pass "The How to join page answers HTTP 200 with no Set-Cookie header"
  else
    fail "Expected HTTP 200 and no Set-Cookie for the How to join page; got $JOIN_STATUS"
  fi
  SESSION_COOKIE="$(sign_in_cookie "$PORT1" staff-01 "$STAFF_PASSWORD")"
  if [ -n "$SESSION_COOKIE" ]; then
    pass "staff-01 signs in and receives the session cookie"
  else
    fail "staff-01 cannot sign in"
  fi
  # F-origin (Red r6): the own origin is `<scheme>://<Host header>`, with the scheme from
  # x-forwarded-proto when present and else from the request URL. Cloud Run sends the public Host
  # and keeps the server at the bind address, so the old check (request.nextUrl.origin) refused
  # every browser sign-in with 403. This POST names the site in Host and Origin, with no
  # forwarded proto, and must sign in (303 with a session cookie), not answer 403.
  STANDALONE_ORIGIN_HEADERS="$(curl --silent --show-error -D - -o /dev/null -X POST \
    -H "Host: storytime.example.test" \
    -H "Origin: http://storytime.example.test" \
    --data-urlencode "username=staff-01" --data-urlencode "password=$STAFF_PASSWORD" \
    --data-urlencode "locale=th" --data-urlencode "next=/th/st" \
    "http://127.0.0.1:$PORT1/api/auth/sign-in")" || STANDALONE_ORIGIN_HEADERS=""
  STANDALONE_ORIGIN_STATUS="$(printf '%s\n' "$STANDALONE_ORIGIN_HEADERS" | head -n 1 | tr -d '\r' | awk '{print $2}')"
  [ -n "$STANDALONE_ORIGIN_STATUS" ] || STANDALONE_ORIGIN_STATUS="fetch-failed"
  STANDALONE_ORIGIN_COOKIE=0
  headers_hold_cookie "$STANDALONE_ORIGIN_HEADERS" && STANDALONE_ORIGIN_COOKIE=1
  echo "standalone_origin_status=$STANDALONE_ORIGIN_STATUS"
  echo "standalone_origin_cookie=$STANDALONE_ORIGIN_COOKIE"
  if [ "$STANDALONE_ORIGIN_STATUS" = "303" ] && [ "$STANDALONE_ORIGIN_COOKIE" -eq 1 ]; then
    pass "A proxied sign-in with the site Host and Origin signs in (not 403)"
  else
    fail "Expected 303 and a session cookie for the proxied sign-in; got $STANDALONE_ORIGIN_STATUS (cookie=$STANDALONE_ORIGIN_COOKIE)"
  fi
  # F60 (Red r11): the 303 Location of the standalone sign-in must name the public host, not the
  # bind address. request.nextUrl.origin is http://0.0.0.0:<port> in the image, so the old redirect
  # sent the browser to the bind address. This row reads the Location value, not only the status,
  # and accepts a relative path or the public host of the Host header.
  STANDALONE_LOCATION="$(printf '%s\n' "$STANDALONE_ORIGIN_HEADERS" | tr -d '\r' | sed -n 's/^[Ll]ocation:[[:space:]]*//p' | head -n 1)"
  STANDALONE_LOCATION_BIND=0
  case "$STANDALONE_LOCATION" in
    *0.0.0.0*|*localhost*|*127.0.0.1*) STANDALONE_LOCATION_BIND=1 ;;
  esac
  case "$STANDALONE_LOCATION" in
    /*|"http://storytime.example.test/"*) : ;;
    *) STANDALONE_LOCATION_BIND=1 ;;
  esac
  echo "standalone_location=$STANDALONE_LOCATION"
  echo "standalone_location_bind=$STANDALONE_LOCATION_BIND"
  if [ -n "$STANDALONE_LOCATION" ] && [ "$STANDALONE_LOCATION_BIND" -eq 0 ]; then
    pass "The standalone sign-in Location names the public host, not the bind address"
  else
    fail "The standalone sign-in Location names the bind address or is missing: $STANDALONE_LOCATION"
  fi
  STATUS_D="$(status_of "http://127.0.0.1:$PORT1/th/st/2/2" "$SESSION_COOKIE")"
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
  STATUS_R="$(status_of "http://127.0.0.1:$PORT1/th/st/2/1" "$SESSION_COOKIE")"
  if [ "$STATUS_R" = "200" ]; then
    pass "The shipped w01 answers HTTP 200 (ready at the pin 82f88853)"
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
  PORT3="$(free_port)"
  C3="$(start_app "$PORT3" --volume "$BROKEN:/fixture:ro" --env STORYTIME_CONTENT_DIR=/fixture)" || fail "The broken-clone container cannot start"
fi
if [ -n "$C3" ]; then
  wait_ready "127.0.0.1:$PORT3" >/dev/null 2>&1 || true
  STATUS_B="$(status_of "http://127.0.0.1:$PORT3/th/st/2/1" "$SESSION_COOKIE")"
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
  PORT2="$(free_port)"
  C2="$(start_app "$PORT2" --volume "$FIXTURE:/fixture:ro" --env STORYTIME_CONTENT_DIR=/fixture)" || fail "The fixture container cannot start"
fi
if [ -n "$C2" ]; then
  wait_ready "127.0.0.1:$PORT2" >/dev/null 2>&1 || true
  STATUS2="$(status_of "http://127.0.0.1:$PORT2/th/st/2/1" "$SESSION_COOKIE")"
  if [ "$STATUS2" = "200" ]; then
    pass "The printed route returns HTTP 200 with the fixture"
  else
    fail "Expected HTTP 200 with the fixture; got $STATUS2"
  fi
  BODY="$(curl --silent -H "Cookie: $SESSION_COOKIE" "http://127.0.0.1:$PORT2/th/st/2/1")"
  ROBOTS_META="$(printf '%s' "$BODY" | grep -oi '<meta[^>]*name="robots"[^>]*>' | head -n 1)"
  if printf '%s' "$ROBOTS_META" | grep -qi "noindex"; then
    pass "The week page metadata holds noindex"
  else
    fail "The week page metadata misses noindex"
  fi
  # A4-3 and B4-1: the row fails on a failed curl or a status-line-less answer, not only on
  # a Set-Cookie line (the old row passed vacuously on empty headers).
  if week_no_cookie_ok "http://127.0.0.1:$PORT2/th/st/2/1" "$SESSION_COOKIE"; then
    pass "The week page sends no Set-Cookie header"
  elif [ "$WEEK_HEADERS_RC" -ne 0 ]; then
    fail "The week page sends no Set-Cookie header (curl_rc=$WEEK_HEADERS_RC)"
  else
    fail "The week page sends no Set-Cookie header (no status line or a Set-Cookie field)"
  fi
  # B4-1: the locale redirect answer sends no Set-Cookie header either (AC-2.1 middleware;
  # curl without -L shows the redirect answer itself).
  if week_no_cookie_ok "http://127.0.0.1:$PORT2/st/2/1" && printf '%s\n' "$WEEK_HEADERS" | head -n 1 | grep -q ' 307'; then
    pass "The locale redirect answers HTTP 307 with no Set-Cookie header"
  elif [ "$WEEK_HEADERS_RC" -ne 0 ]; then
    fail "The locale redirect answers HTTP 307 with no Set-Cookie header (curl_rc=$WEEK_HEADERS_RC)"
  else
    fail "The locale redirect answers HTTP 307 with no Set-Cookie header (got $(printf '%s\n' "$WEEK_HEADERS" | head -n 1 | tr -d '\r'))"
  fi
  # P3.6 week-404 row: a week outside the shipped range answers 404 with the Thai and
  # English lines of app/[locale]/not-found.tsx. The live `lang` check is the browser-gate
  # row (PM 2026-11-05): the curl document is the Next.js error shell without `lang`.
  P404_CODE="$(curl --silent --show-error -H "Cookie: $SESSION_COOKIE" -o "$TMP_DIR/notfound.html" -w '%{http_code}' "http://127.0.0.1:$PORT2/th/st/2/99")"
  P404_BODY="$(cat "$TMP_DIR/notfound.html")"
  if [ "$P404_CODE" = "404" ]; then
    pass "A week outside the shipped range answers HTTP 404"
  else
    fail "A week outside the shipped range answers HTTP 404; got $P404_CODE"
  fi
  # The look track (5ab3834bb) moved the 404 text into a client view (not-found-view.tsx), so
  # the curl document holds none of the Thai or English 404 lines (404_body_bytes was 8183 with
  # zero hits for the four lines at the first run). The two text rows moved to the live-DOM
  # browser gates: look-phase1-browser-gate.sh (not-open lines) and phase3-browser-gate.sh
  # (generic lines). This script keeps the status row and the no-cookie row.
  # B4-1 and F201: the 404 answer sends no Set-Cookie header either; the row reuses
  # week_no_cookie_ok and prints its labeled value.
  if week_no_cookie_ok "http://127.0.0.1:$PORT2/th/st/2/99" "$SESSION_COOKIE"; then
    echo "404_no_set_cookie=1 (status=$P404_CODE, curl_rc=0)"
    pass "The 404 answer sends no Set-Cookie header"
  elif [ "$WEEK_HEADERS_RC" -ne 0 ]; then
    echo "404_no_set_cookie=0 (status=$P404_CODE, curl_rc=$WEEK_HEADERS_RC)"
    fail "The 404 answer sends no Set-Cookie header (curl_rc=$WEEK_HEADERS_RC)"
  else
    echo "404_no_set_cookie=0 (status=$P404_CODE, a Set-Cookie field or no status line)"
    fail "The 404 answer sends no Set-Cookie header (no status line or a Set-Cookie field)"
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
LEFT_STATE="$(left_behind_state)"
case "$LEFT_STATE" in
  podman-failed)
    fail "podman images exits 0 when the image row counts what stays behind"
    ;;
  left-behind)
    fail "A storytime smoke image stays behind"
    ;;
  clean)
    pass "No storytime smoke image stays behind"
    ;;
esac

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
