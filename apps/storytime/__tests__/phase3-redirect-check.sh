#!/usr/bin/env bash
set -uo pipefail

# The live locale redirect check of the at-home route (spec AC-2.1, plan task 3.1).
# It starts the dev server on the shipped content and reads the `Location` header of four
# redirect probes: a plain path, a forged `Host`, a forged `X-Forwarded-Host`, and a path that
# starts with `//`. AC-2.1 allows a relative path or the request origin. A probe fails when the
# `Location` names another host.
#
# Without --locked the script re-enters through heavy-run.sh, which takes the heavy lock and runs
# the pre-flight. Callers run the script plain, with no flock.
if [ "${1:-}" != "--locked" ]; then
  exec bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
PORT="${PHASE3_REDIRECT_PORT:-3413}"
HOST="127.0.0.1:$PORT"
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
LOG="$(mktemp -t storytime-redirect-XXXXXX.log)"
SERVER_PID_FILE="$(mktemp -t storytime-redirect-pid-XXXXXX)"

# Stops the whole process group of the dev server and waits for the port to close.
# The dev server starts its own child, so a kill of the parent leaves the child alive.
stop_server_group() {
  if [ -n "$SERVER_PID" ]; then
    kill -- "-$SERVER_PGID" 2>/dev/null || kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  fi
  if [ -n "$SERVER_PORT" ]; then
    for _ in $(seq 1 30); do
      if ! ss -ltn 2>/dev/null | grep -qE ":${SERVER_PORT}[[:space:]]"; then break; fi
      sleep 1
    done
    if ss -ltn 2>/dev/null | grep -qE ":${SERVER_PORT}[[:space:]]"; then
      echo "port_still_open=$SERVER_PORT"
    else
      echo "port_closed=$SERVER_PORT"
    fi
  fi
}

cleanup() {
  stop_server_group
  rm -f "$LOG" "$SERVER_PID_FILE"
}
trap cleanup EXIT INT TERM

echo "=== Start the dev server on the shipped content ==="
setsid bash -c "echo \$\$ > '$SERVER_PID_FILE'; cd '$ROOT/apps/storytime' && exec ../../node_modules/.bin/next dev --port '$PORT' > '$LOG' 2>&1" &
for _ in $(seq 1 20); do
  [ -s "$SERVER_PID_FILE" ] && break
  sleep 0.2
done
SERVER_PID="$(cat "$SERVER_PID_FILE" 2>/dev/null)"
SERVER_PGID="$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ')"
[ -n "$SERVER_PGID" ] || SERVER_PGID="$SERVER_PID"
SERVER_PORT="$PORT"
READY=0
for _ in $(seq 1 120); do
  STATUS="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://$HOST/th/st/2/1")" || true
  if [ "$STATUS" != "000" ]; then READY=1; break; fi
  sleep 1
done
if [ "$READY" = "1" ]; then pass "The dev server answers"; else fail "The dev server did not start; see the log"; fi

# Reads the Location header of one probe.
# $1 The label of the probe. $2 The probe path. $3 The allowed host. $4 The accepted statuses,
# pipe separated. The remaining values are `curl -H` headers.
check_location() {
  local label="$1" path="$2" allowed="$3" statuses="$4"
  shift 4
  local headers status location
  headers="$(mktemp -t storytime-location-XXXXXX.txt)"
  status="$(curl --silent --path-as-is --output /dev/null --dump-header "$headers" --write-out '%{http_code}' "$@" "http://$HOST$path")" || true
  location="$(tr -d '\r' < "$headers" | awk 'tolower($1) == "location:" {print $2}')"
  rm -f "$headers"
  echo "PROBE $label: status=$status location=${location:-<none>}"
  case "|$statuses|" in
    *"|$status|"*) ;;
    *)
      fail "$label: expected HTTP $statuses, got $status"
      return
      ;;
  esac
  if [ -z "$location" ]; then
    fail "$label: the redirect holds no Location header"
    return
  fi
  case "$location" in
    //*)
      fail "$label: the Location starts with // and leaves this origin ($location)"
      return
      ;;
    /*)
      pass "$label: a relative Location keeps the request on this origin"
      return
      ;;
    http://*|https://*)
      local host_only
      host_only="$(printf '%s' "$location" | sed -E 's#^[a-z]+://([^/]+).*#\1#')"
      if [ "$host_only" = "$allowed" ]; then
        pass "$label: the Location names the request origin ($host_only)"
      else
        fail "$label: the Location names another host ($host_only), not $allowed"
      fi
      return
      ;;
    *)
      fail "$label: the Location is neither a path nor an absolute URL ($location)"
      ;;
  esac
}

if [ "$READY" = "1" ]; then
  echo "=== AC-2.1 the plain path redirects to the Thai path ==="
  check_location "plain path" "/st/2/1" "$HOST" "307"
  check_location "root path" "/" "$HOST" "307"

  echo "=== AC-2.1 a forged Host does not move the redirect ==="
  check_location "forged Host" "/st/2/1" "forged.example" "307" --header "Host: forged.example"

  echo "=== AC-2.1 a forged X-Forwarded-Host does not move the redirect ==="
  check_location "forged X-Forwarded-Host" "/st/2/1" "$HOST" "307" \
    --header "X-Forwarded-Host: evil.example" --header "X-Forwarded-Proto: https"

  echo "=== AC-2.1 a path with // does not redirect off-site ==="
  # Next normalizes the duplicated slash itself and answers 308 with a path Location.
  check_location "double slash" "//st/2/1" "$HOST" "307|308"
fi

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
