#!/usr/bin/env bash
set -uo pipefail

# The first-load byte budget of the sign-in/entry route (launch pack, track
# storytime_at_home_release_20261106, task 3.4). The measure is the CDP
# Network.loadingFinished encodedDataLength sum of one signed-out load, the same
# basis as the 442296-byte first-load figure of phase3-browser-gate.sh. The
# budget covers the place picture that the entry route loads at each width:
#   390x844, deviceScaleFactor 1    - the 720w landscape candidate
#   390x844, deviceScaleFactor 2.625 - the 1280w landscape candidate
#   980x800, deviceScaleFactor 1    - the 720w portrait candidate
#   1280x800, deviceScaleFactor 1   - the 720w portrait candidate
# No account, database, or session is needed: the sign-in page is public.
#
# Without --locked the script re-enters through heavy-run.sh.
if [ "${1:-}" != "--locked" ]; then
  export HEAVY_PRIORITY="${HEAVY_PRIORITY:-p1}"
  exec bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
TMP_DIR="$(mktemp -d -t storytime-entry-budget-XXXXXX)"
PORT="$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();});')"
PLAYWRIGHT="$APP/.next/entry-first-load-budget-$$.mjs"
SERVER_PID=""; SERVER_PGID=""; SERVER_PORT=""

stop_group() {
  local pid="$1" pgid="$2" port="$3"
  if [ -n "$pid" ]; then
    kill -- "-$pgid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  if [ -n "$port" ]; then
    for _ in $(seq 1 30); do
      if ! ss -ltn 2>/dev/null | grep -qE ":${port}[[:space:]]"; then break; fi
      sleep 1
    done
    if ss -ltn 2>/dev/null | grep -qE ":${port}[[:space:]]"; then echo "port_still_open=$port"; else echo "port_closed=$port"; fi
  fi
}

cleanup() {
  stop_group "$SERVER_PID" "$SERVER_PGID" "$SERVER_PORT"
  rm -f "$PLAYWRIGHT"
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

echo "=== Build the app (retry once on the known Next.js security-notice stop) ==="
BUILD_OK=1
if (cd "$APP" && ../../node_modules/.bin/next build >"$TMP_DIR/build.log" 2>&1); then
  echo "build_attempt_1=0"
else
  echo "build_attempt_1=1"
  if (cd "$APP" && ../../node_modules/.bin/next build >"$TMP_DIR/build-2.log" 2>&1); then
    echo "build_attempt_2=0"
  else
    BUILD_OK=0
    echo "build_attempt_2=1"
    tail -20 "$TMP_DIR/build-2.log" || true
  fi
fi
if [ "$BUILD_OK" -eq 1 ]; then pass "The production build exits 0"; else fail "The production build fails"; printf '%s\n' "${RESULTS[@]}"; exit "$FAILED"; fi

echo "=== Start next start on a free 127.0.0.1 port ==="
setsid bash -c "echo \$\$ > '$TMP_DIR/server.pid'; cd '$APP' && STORYTIME_DATABASE_URL='postgres://postgres:storytime@127.0.0.1:1/storytime' \
  STORYTIME_MEDIA_BASE='gs://storytime-app-media' \
  STORYTIME_STORAGE_ENDPOINT='http://127.0.0.1:1' \
  STORYTIME_STORAGE_ACCESS_KEY='local-access-key' \
  STORYTIME_STORAGE_SECRET_KEY='local-secret-key' \
  exec ../../node_modules/.bin/next start -p '$PORT' > '$TMP_DIR/next-start.log' 2>&1" &
SERVER_PID=$!
SERVER_PGID=$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ' || echo "$SERVER_PID")
SERVER_PORT="$PORT"
APP_UP=0
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://localhost:$PORT/th/sign-in"; then APP_UP=1; break; fi
  sleep 2
done
if [ "$APP_UP" -eq 1 ]; then pass "The app answers on the local port"; else fail "The app does not answer"; printf '%s\n' "${RESULTS[@]}"; exit "$FAILED"; fi

cat > "$PLAYWRIGHT" <<'NODE'
import { chromium } from '@playwright/test';

const base = process.argv[2];
const budget = 300000;
const cases = [
  { name: '390-dpr1', width: 390, height: 844, dpr: 1 },
  { name: '390-dpr2625', width: 390, height: 844, dpr: 2.625 },
  { name: '980-dpr1', width: 980, height: 800, dpr: 1 },
  { name: '1280-dpr1', width: 1280, height: 800, dpr: 1 },
];
const browser = await chromium.launch();
let failed = 0;
try {
  for (const item of cases) {
    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      deviceScaleFactor: item.dpr,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const byId = new Map();
    const transfers = [];
    cdp.on('Network.requestWillBeSent', (event) => {
      byId.set(event.requestId, { url: event.request.url, type: event.type });
    });
    cdp.on('Network.loadingFinished', (event) => {
      const entry = byId.get(event.requestId);
      if (entry) transfers.push({ ...entry, bytes: event.encodedDataLength });
    });
    await cdp.send('Network.enable');
    const response = await page.goto(`${base}/th/sign-in`, { waitUntil: 'networkidle' });
    const bytes = transfers.reduce((sum, transfer) => sum + transfer.bytes, 0);
    console.log(`transferred_bytes_first_load_with_place_pictures_${item.name}=${bytes}`);
    const biggest = [...transfers].sort((a, b) => b.bytes - a.bytes).slice(0, 3)
      .map((t) => `${t.bytes}:${new URL(t.url).pathname}`).join(' ');
    console.log(`top_transfers_${item.name}=${biggest}`);
    if (response?.status() !== 200) { console.log(`FAIL: B10 ${item.name} sign-in answers 200 (status=${response?.status()})`); failed = 1; }
    if (bytes > budget) { console.log(`FAIL: B10 ${item.name} first load with place pictures <= ${budget} (transferred=${bytes})`); failed = 1; }
    else { console.log(`PASS: B10 ${item.name} first load with place pictures <= ${budget} (transferred=${bytes})`); }
    await context.close();
  }
} finally {
  await browser.close();
}
process.exit(failed);
NODE

echo "=== Measure the first-load payload of the sign-in route ==="
if (cd "$APP" && node "$PLAYWRIGHT" "http://localhost:$PORT" >"$TMP_DIR/playwright.log" 2>&1); then
  pass "The first-load budget run exits 0"
else
  fail "The first-load budget run exits non-zero"
fi
grep -E '^(PASS|FAIL): B10' "$TMP_DIR/playwright.log" || true
grep -E '^transferred_bytes_first_load_with_place_pictures_|^top_transfers_' "$TMP_DIR/playwright.log" || true
tail -10 "$TMP_DIR/playwright.log" || true

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
