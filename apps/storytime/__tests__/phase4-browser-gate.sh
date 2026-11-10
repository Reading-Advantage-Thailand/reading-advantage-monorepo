#!/usr/bin/env bash
# The Phase 4 browser gate (plan task 4.5, test strategy P4 and P4.7).
#
# The gate builds the Storytime production app once, then runs three server runs:
#   (a) the teacher flag `STORYTIME_TEACHER_ROUTES=1`, with a draft-loops copy of the shipped w01;
#   (b) the teacher flag `STORYTIME_TEACHER_ROUTES=1`, with an approved-loops copy of w01;
#   (c) the teacher flag not set, so every teacher route answers 404.
#
# The fixtures live in a scratch folder outside the repository, through `STORYTIME_CONTENT_DIR`
# (test strategy P3.7). No fixture file goes into `content/`.
#
# The rows: each day 1 to 5 of w01 renders at 1920x1080 and 1366x768 with no horizontal scroll,
# B1 to B4 (the media player), L1 to L4 (the teacher loops), S1 and S2 (the share moment), and the
# flag-off 404 for the week view and each day route, with and without the locale.
#
# The self-test pages run first: a 30 px button, a 400 KB script, white text on #3080ff, a 12 px
# text page, an oversized box, and a row wider than the viewport. Each page must fail its limit,
# or the gate exits non-zero.
#
# The server port is free and never 3005 or 3099. The server stops by its pid file, and the exit
# trap removes the scratch folder. The gate prints labeled lines and ends with `PASS=<n>, FAIL=<n>`.
set -uo pipefail

if [ "${1:-}" != "--locked" ]; then
  HEAVY_PRIORITY=p1 exec bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" \
    -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
TMP_DIR="$(mktemp -d -t storytime-phase4-XXXXXX)"
DRAFT_DIR="$TMP_DIR/draft"
APPROVED_DIR="$TMP_DIR/approved"
OFF_DIR="$TMP_DIR/off"
SERVER_LOG="$TMP_DIR/next-start.log"
SERVER_PID_FILE="$TMP_DIR/server.pid"
PLAYWRIGHT="$APP/.next/phase4-browser-gate-$$.mjs"
DB_CONTAINER="storytime-phase4-gate-db-$$"
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
DB_URL=""

# Stops the whole process group of the server and waits for the port to close.
# The server starts its own `next-server` child, so a kill of the parent leaves the child alive.
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
  SERVER_PORT=""
}

cleanup() {
  stop_server_group
  podman rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  rm -f "$PLAYWRIGHT"
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

echo "=== Build the Storytime production app once, with the teacher flag not set ==="
mkdir -p "$APP/.next"
if (cd "$APP" && ../../node_modules/.bin/next build); then pass "Production build exits 0"; else fail "Production build failed"; fi

echo "=== Create the draft and approved copies of the shipped w01 outside the repository ==="
FIXTURE_RC=1
if [ -f "$APP/content/l2/w01.json" ]; then
  node --input-type=module - "$APP/content/l2/w01.json" "$DRAFT_DIR" "$APPROVED_DIR" "$OFF_DIR" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [sourceFile, draftDir, approvedDir, offDir] = process.argv.slice(2);
const week = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
if (week.approval?.loops?.status !== 'draft') {
  throw new Error('the shipped w01 holds no draft loops part; the loops-off run needs it');
}
const write = (dir, value) => {
  fs.mkdirSync(path.join(dir, 'l2'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'l2', 'w01.json'), JSON.stringify(value));
};
// Run (a) and run (c) read the shipped week as it is: the loops part stays draft.
write(draftDir, week);
write(offDir, week);
// Run (b) reads an approved clone. The contract fails an approved loops part with no date or no
// words, so the clone fills both (test strategy P4.0).
const approved = structuredClone(week);
approved.approval.loops = {
  status: 'approved',
  date: '2026-11-10',
  words: 'phase 4 browser gate clone',
};
write(approvedDir, approved);
NODE
  FIXTURE_RC=$?
fi
if [ "$FIXTURE_RC" -eq 0 ]; then
  pass "Draft and approved copies of w01 sit in $TMP_DIR"
else
  fail "Could not create the w01 copies"
fi

echo "=== Start the local database and make the account teach-01 (teacher) ==="
DB_PORT="$(node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
DB_URL="postgres://postgres:storytime@127.0.0.1:$DB_PORT/storytime"
TEACHER_PASSWORD=""
SEED_OK=0
if podman run -d --name "$DB_CONTAINER" -p "127.0.0.1:$DB_PORT:5432" \
  -e POSTGRES_PASSWORD=storytime -e POSTGRES_DB=storytime \
  docker.io/library/postgres:16-alpine >/dev/null 2>&1; then
  for _ in $(seq 1 60); do
    if podman exec "$DB_CONTAINER" pg_isready -U postgres -d storytime >/dev/null 2>&1; then break; fi
    sleep 1
  done
  mkdir -p "$TMP_DIR/accounts"
  printf 'name,class,role\nTeacher One,teach,teacher\n' > "$TMP_DIR/accounts/accounts.csv"
  if (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" pnpm --filter @reading-advantage/db storytime:migrate >"$TMP_DIR/migrate.log" 2>&1) \
    && (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" ./node_modules/.bin/tsx apps/storytime/scripts/make-accounts.ts --folder "$TMP_DIR/accounts" --database-url-env STORYTIME_DATABASE_URL >"$TMP_DIR/accounts.log" 2>&1) \
    && [ -s "$TMP_DIR/accounts/sign-in-cards.csv" ]; then
    SEED_OK=1
    TEACHER_PASSWORD="$(awk -F, '$1=="teach-01" { print $NF }' "$TMP_DIR/accounts/sign-in-cards.csv" | tr -d '\r')"
  fi
fi
if [ "$SEED_OK" -eq 1 ] && [ -n "$TEACHER_PASSWORD" ]; then
  pass "Local database holds the account teach-01"
else
  fail "Could not make the account teach-01"
fi

# Starts the built server on a free 127.0.0.1 port, never 3005 and never 3099.
# $1 is the content folder, and $2 is the teacher flag value, or an empty string to leave the
# value out of the environment. Run (c) passes an empty string, so the default proves itself.
start_server() {
  local content="$1" flag="$2" flag_env="" chosen=""
  while :; do
    chosen="$(node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
    if [ "$chosen" != "3005" ] && [ "$chosen" != "3099" ]; then break; fi
  done
  SERVER_PORT="$chosen"
  if [ -n "$flag" ]; then flag_env="STORYTIME_TEACHER_ROUTES='$flag'"; fi
  : > "$SERVER_PID_FILE"
  : > "$SERVER_LOG"
  setsid bash -c "echo \$\$ > '$SERVER_PID_FILE'; cd '$APP' && STORYTIME_CONTENT_DIR='$content' STORYTIME_DATABASE_URL='$DB_URL' STORYTIME_MEDIA_BASE='gs://storytime-app-media' STORYTIME_STORAGE_ENDPOINT='http://127.0.0.1:$SERVER_PORT' STORYTIME_STORAGE_ACCESS_KEY='gate-access-key' STORYTIME_STORAGE_SECRET_KEY='gate-secret-key' $flag_env exec ../../node_modules/.bin/next start --hostname 127.0.0.1 --port '$SERVER_PORT' >'$SERVER_LOG' 2>&1" &
  for _ in $(seq 1 20); do
    [ -s "$SERVER_PID_FILE" ] && break
    sleep 0.2
  done
  SERVER_PID="$(cat "$SERVER_PID_FILE" 2>/dev/null)"
  SERVER_PGID="$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ')"
  [ -n "$SERVER_PGID" ] || SERVER_PGID="$SERVER_PID"
  local ready=0 status=""
  for _ in $(seq 1 120); do
    status="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:$SERVER_PORT/th/st/2/1")" || true
    if [ "$status" != "000" ]; then ready=1; break; fi
    sleep 1
  done
  if [ "$ready" -eq 1 ]; then return 0; fi
  return 1
}

# Runs the Playwright module for one server run. $1 is the run letter and $2 the fixture week.
run_browser() {
  PROJECT_DEV_URL="http://127.0.0.1:$SERVER_PORT" \
  PROJECT_PHASE4_RUN="$1" \
  PROJECT_FIXTURE_WEEK="$2" \
  PROJECT_SIGN_IN_USER=teach-01 \
  PROJECT_SIGN_IN_PASSWORD="$TEACHER_PASSWORD" \
  timeout 25m node "$PLAYWRIGHT"
}

cat > "$PLAYWRIGHT" <<'NODE'
import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';

const base = process.env.PROJECT_DEV_URL;
const run = process.env.PROJECT_PHASE4_RUN ?? 'a';
const week = JSON.parse(fs.readFileSync(process.env.PROJECT_FIXTURE_WEEK, 'utf8'));
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

// The sign-in helper of the Phase 3 gate, unchanged. The helper posts the form with the origin of
// the request itself, because the login origin check compares the Origin header with the Host
// header. The password comes from the environment and never reaches a log line.
const SIGN_IN_ORIGIN = new URL(base).origin;
async function signIn(user, password) {
  const body = new URLSearchParams({ username: user, password, locale: 'th', next: '/th/st' });
  const response = await fetch(`${base}/api/auth/sign-in`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: SIGN_IN_ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const cookie = response.headers.getSetCookie().map(line => /^(__Host-st_session)=([^;]+)/.exec(line)).find(Boolean);
  if (!cookie) throw new Error(`sign-in of ${user} gave status ${response.status} and no session cookie`);
  return { name: cookie[1], value: cookie[2] };
}
const SESSION = await signIn(process.env.PROJECT_SIGN_IN_USER, process.env.PROJECT_SIGN_IN_PASSWORD);
/** Opens a browser context that holds the session cookie of the signed-in account. */
async function signedContext(options) {
  const context = await browser.newContext(options);
  const setup = await context.newPage();
  const cdp = await context.newCDPSession(setup);
  const stored = await cdp.send('Network.setCookie', { name: SESSION.name, value: SESSION.value, url: base, httpOnly: true, secure: true, sameSite: 'Lax' });
  if (!stored.success) throw new Error('the browser refused the session cookie');
  await cdp.detach();
  await setup.close();
  return context;
}
let postRequests = 0;
/** Opens one signed-in page in its own context and counts every POST of the page. */
async function signedPage() {
  const context = await signedContext({});
  const pg = await context.newPage();
  pg.on('request', request => { if (request.method() === 'POST') postRequests += 1; });
  pg.on('close', () => { context.close().catch(() => {}); });
  return pg;
}
let pass = 0, fail = 0;
const results = [];
function record(name, ok, detail = '') {
  const line = `${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` (${detail})` : ''}`;
  results.push(line);
  console.log(line);
  ok ? pass++ : fail++;
}
async function runCheck(name, action) {
  try {
    const result = await action();
    record(name, result.ok, result.detail ?? '');
    return result.value;
  } catch (error) {
    record(name, false, String(error));
    return null;
  }
}
function ratio(fg, bg) {
  const lum = (rgb) => {
    const c = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
// A silent 3 s WAV stands in for every audio file, so the players decode and play.
function wavBuffer(seconds) {
  const rate = 8000, channels = 1, bits = 16;
  const frames = Math.floor(rate * seconds);
  const blockAlign = channels * bits / 8;
  const dataBytes = frames * blockAlign;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataBytes, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22); buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * blockAlign, 28); buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bits, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}
const WAV = wavBuffer(3);
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
/** Answers every signed media URL with a real audio or picture body, so a player can render. */
async function interceptMedia(pg) {
  await pg.route(url => url.pathname.includes('/media/') || url.searchParams.has('X-Amz-Signature'), route => {
    const path = new URL(route.request().url()).pathname;
    if (/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(path)) return route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
    if (/\.(png|webp|jpe?g|gif|avif)$/i.test(path)) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    if (/\.(mp4|m4v|mov|webm|ogv)$/i.test(path)) return route.fulfill({ status: 204, body: '' });
    return route.continue();
  });
}
/** Gives the smallest computed font size of the elements with their own visible text. */
async function minFontPx(pg, selector) {
  return pg.evaluate((sel) => {
    const values = [];
    const roots = sel === null ? [document.body] : [...document.querySelectorAll(sel)];
    for (const root of roots) {
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
        const hasText = [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim() !== '');
        if (!hasText) continue;
        const rect = el.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        values.push(parseFloat(style.fontSize));
      }
    }
    return { count: values.length, min: values.length ? Math.min(...values) : 0 };
  }, selector);
}
/** Gives the page width, the scroll width, and the height of the viewport and the document. */
async function pageBox(pg) {
  return pg.evaluate(() => ({
    scrollWidth: Math.round(document.documentElement.scrollWidth),
    innerWidth: Math.round(window.innerWidth),
    scrollHeight: Math.round(document.documentElement.scrollHeight),
    innerHeight: Math.round(window.innerHeight),
  }));
}
/** Gives the count and the smallest side of the elements that match, at the current viewport. */
async function tapTargets(pg, selector) {
  return pg.evaluate((sel) => {
    const items = [];
    for (const el of document.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      items.push({
        tag: el.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        side: Math.floor(Math.min(rect.width, rect.height)),
      });
    }
    return {
      count: items.length,
      min: items.length ? Math.min(...items.map(item => item.side)) : 0,
      items: items.slice(0, 5),
    };
  }, selector);
}
const OPEN_MEDIA = 'Open media';
const CLOSE = 'Close';
const NEXT = 'Next step';
const PLAYER = 'section[aria-label="The media player"]';
const STEP = '[data-step-id]';

/** Opens one lesson day at an optional viewport. */
async function openDay(pg, day, viewport) {
  if (viewport) await pg.setViewportSize(viewport);
  await pg.goto(`${base}/th/teacher/2/1/${day}`, { waitUntil: 'networkidle' });
}
/** Gives the id of the step on screen, or `null`. */
async function currentStep(pg) {
  return pg.locator(STEP).first().getAttribute('data-step-id');
}
/** Clicks "Next step" and reports whether the control existed. */
async function nextStep(pg) {
  const next = pg.getByRole('button', { name: NEXT, exact: true });
  if (!(await next.count())) return false;
  await next.click();
  await pg.waitForTimeout(90);
  return true;
}
/** Walks the flow to one step id. */
async function goToStep(pg, id) {
  for (let index = 0; index < 12; index += 1) {
    if ((await currentStep(pg)) === id) return true;
    if (!(await nextStep(pg))) return false;
  }
  return false;
}
/** Gives the step time on screen in minutes, from the step header. */
async function stepTimeMinutes(pg) {
  return pg.evaluate(() => {
    const step = document.querySelector('[data-step-id]');
    const text = step?.querySelector('header')?.innerText ?? '';
    const match = /(\d+)\s*min/.exec(text);
    return match ? Number(match[1]) : null;
  });
}
/**
 * Walks every screen of one lesson day and collects the labeled values of the rows: the step ids,
 * the loop panels with their step, the recall day, the share moments, the widest scroll width, and
 * the smallest font size of the loop and recall panels when `fonts` is set.
 */
async function walkDay(pg, day, options = {}) {
  const state = { day, ids: [], loopSteps: [], recallDays: [], moments: [], maxScrollWidth: 0, screens: 0, fontMins: [] };
  for (let index = 0; index < 20; index += 1) {
    const info = await pg.evaluate(() => {
      const step = document.querySelector('[data-step-id]');
      return {
        id: step?.getAttribute('data-step-id') ?? null,
        loops: [...document.querySelectorAll('[data-loop]')].map(el => el.getAttribute('data-loop')),
        recall: document.querySelector('[data-recall-day]')?.getAttribute('data-recall-day') ?? null,
        moments: [...document.querySelectorAll('[data-share-moment]')].map(el => el.getAttribute('data-share-moment')),
        scrollWidth: Math.round(document.documentElement.scrollWidth),
        innerWidth: Math.round(window.innerWidth),
      };
    });
    state.screens += 1;
    if (info.id) state.ids.push(info.id);
    for (const loop of info.loops) state.loopSteps.push(`${info.id}:${loop}`);
    if (info.recall) state.recallDays.push(Number(info.recall));
    state.moments.push(...info.moments);
    if (info.scrollWidth > info.innerWidth + 1) {
      state.maxScrollWidth = Math.max(state.maxScrollWidth, info.scrollWidth);
    }
    if (options.fonts) {
      const measured = await minFontPx(pg, '[data-loop], [data-recall-day]');
      if (measured.count > 0) state.fontMins.push(measured.min);
    }
    if (!(await nextStep(pg))) break;
  }
  return state;
}
/** Opens the player of the current step. */
async function openPlayer(pg) {
  await pg.getByRole('button', { name: OPEN_MEDIA, exact: true }).click();
  await pg.locator(PLAYER).waitFor({ timeout: 10000 });
  await pg.waitForTimeout(300);
}

try {
  // ---------------------------------------------------------------- self-tests
  const selfTestPages = new Map([
    ['/button', '<!doctype html><button style="width:30px;height:30px">x</button>'],
    ['/large-script', `<!doctype html><script>window.payload='${'x'.repeat(400000)}'</script>`],
    ['/contrast', '<!doctype html><p style="color:white;background:#3080ff">x</p>'],
    // The 18 px font rule of row L3: this page holds 12 px text and must fail the floor.
    ['/small-text', '<!doctype html><p style="font-size:12px">small text</p>'],
    // The viewport-fit rule of row B1: a 2000x2000 box cannot fit a 1920x1080 or a 1366x768 screen.
    ['/oversize-box', '<!doctype html><div style="width:2000px;height:2000px;background:#eee"></div>'],
    // The horizontal-scroll rule of the day rows: this row is wider than the 1366 px viewport.
    ['/wide-page', '<!doctype html><div style="width:1600px;height:40px;background:#eee">wide</div>'],
  ]);
  const selfTestServer = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(selfTestPages.get(pathname) ?? '');
  });
  await runCheck('Start inline self-test server', async () => {
    await new Promise((resolve, reject) => {
      selfTestServer.once('error', reject);
      selfTestServer.listen(0, '127.0.0.1', resolve);
    });
    return { ok: true };
  });
  const selfTestPort = selfTestServer.address()?.port;
  const viewportFit = (box, viewport) => box.w <= viewport.width && box.h <= viewport.height;
  for (const [name, path, check] of [
    // The 30 px button fails the 44 px tap floor of row L4.
    ['a 30 px button against the 44 px floor', '/button', async p => {
      const measured = await tapTargets(p, 'button');
      console.log(`selftest tap_target_min_px=${measured.min} (targets=${measured.count}, floor_px=44)`);
      return measured.count > 0 && measured.min >= 44;
    }],
    // The 400 KB script fails the 300000 byte first-load budget.
    ['a 400 KB script against the 300000 byte budget', '/large-script', async p => {
      const bytes = await p.evaluate(() => performance.getEntriesByType('resource').reduce((sum, entry) => sum + (entry.transferSize ?? 0), 0) + (performance.getEntriesByType('navigation')[0]?.transferSize ?? 0));
      console.log(`selftest transferred_bytes=${bytes} (budget_bytes=300000)`);
      return bytes <= 300000;
    }],
    // White on #3080ff fails the 4.5 contrast floor.
    ['white on #3080ff against the 4.5 contrast floor', '/contrast', async p => {
      const value = ratio(
        await p.locator('p').evaluate(el => getComputedStyle(el).color),
        await p.locator('p').evaluate(el => getComputedStyle(el).backgroundColor),
      );
      console.log(`selftest contrast_ratio_x100=${Math.round(value * 100)} (floor_x100=450)`);
      return value >= 4.5;
    }],
    // The 12 px text fails the 18 px font floor of row L3.
    ['12 px text against the 18 px font floor', '/small-text', async p => {
      const measured = await minFontPx(p, 'body');
      console.log(`selftest min_font_px=${measured.min} (text_elements=${measured.count}, floor_px=18)`);
      return measured.count > 0 && measured.min >= 18;
    }],
    // The 2000 px box fails the viewport-fit rule of row B1.
    ['a 2000 px box against the viewport-fit rule', '/oversize-box', async p => {
      await p.setViewportSize({ width: 1920, height: 1080 });
      const box = await p.locator('div').evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { w: Math.round(rect.width), h: Math.round(rect.height) };
      });
      console.log(`selftest viewport_fit=${viewportFit(box, { width: 1920, height: 1080 })} (box=${box.w}x${box.h}, viewport=1920x1080)`);
      return viewportFit(box, { width: 1920, height: 1080 });
    }],
    // The 1600 px row fails the no-horizontal-scroll rule of the day rows.
    ['a 1600 px row against the no-horizontal-scroll rule', '/wide-page', async p => {
      await p.setViewportSize({ width: 1366, height: 768 });
      const box = await pageBox(p);
      console.log(`selftest horizontal_scroll=${box.scrollWidth > box.innerWidth + 1 ? 1 : 0} (scroll_width=${box.scrollWidth}, viewport_width=${box.innerWidth})`);
      return box.scrollWidth <= box.innerWidth + 1;
    }],
  ]) {
    await runCheck(`self-test rejects ${name}`, async () => {
      const p = await browser.newPage();
      try {
        await p.goto(`http://127.0.0.1:${selfTestPort}${path}`, { waitUntil: 'networkidle' });
        const improperlyPassed = await check(p);
        return { ok: !improperlyPassed };
      } finally {
        await p.close();
      }
    });
  }
  await runCheck('Stop inline self-test server', async () => {
    await new Promise((resolve, reject) => selfTestServer.close(error => error ? reject(error) : resolve()));
    return { ok: true };
  });

  // ---------------------------------------------------------------- run (c)
  if (run === 'c') {
    const page = await signedPage();
    try {
      const withLocale = ['/th/teacher/2/1', ...[1, 2, 3, 4, 5].map(day => `/th/teacher/2/1/${day}`)];
      const withoutLocale = ['/teacher/2/1', ...[1, 2, 3, 4, 5].map(day => `/teacher/2/1/${day}`)];
      const visit = async (path) => {
        const response = await page.goto(`${base}${path}`, { waitUntil: 'load' });
        await page.waitForTimeout(400);
        const status = response ? response.status() : null;
        const markup = await page.evaluate(() => ({
          steps: document.querySelectorAll('[data-step-id]').length,
          week: document.querySelectorAll('section[aria-label="The five lessons"]').length,
        }));
        return { status, finalPath: new URL(page.url()).pathname, markup };
      };
      const localized = [];
      for (const path of withLocale) localized.push({ path, ...(await visit(path)) });
      const bare = [];
      for (const path of withoutLocale) bare.push({ path, ...(await visit(path)) });
      console.log(`flag_off_404_week_with_locale=${localized[0].status} (path=${localized[0].path})`);
      console.log(`flag_off_404_week_without_locale=${bare[0].status} (path=${bare[0].path}, final=${bare[0].finalPath})`);
      const daysWithLocale = localized.slice(1).filter(entry => entry.status === 404).length;
      const daysWithoutLocale = bare.slice(1).filter(entry => entry.status === 404).length;
      console.log(`flag_off_404_days_with_locale=${daysWithLocale} (of 5)`);
      console.log(`flag_off_404_days_without_locale=${daysWithoutLocale} (of 5)`);
      const all = [...localized, ...bare];
      const notFound = all.filter(entry => entry.status === 404).length;
      const localePrefix = all.every(entry => /^\/(th|en)\/teacher\//.test(entry.finalPath));
      const markup = all.reduce((sum, entry) => sum + entry.markup.steps + entry.markup.week, 0);
      console.log(`flag_off_404=${notFound} (of ${all.length}, locale_after_redirect=${localePrefix ? 1 : 0}, teacher_markup=${markup})`);
      record('The week view answers 404 with and without the locale', localized[0].status === 404 && bare[0].status === 404, `with_locale=${localized[0].status} without_locale=${bare[0].status}`);
      record('Each of the five day routes answers 404 with and without the locale', daysWithLocale === 5 && daysWithoutLocale === 5, `with_locale=${daysWithLocale} without_locale=${daysWithoutLocale}`);
      record('No teacher markup renders while the flag is off', markup === 0, `teacher_markup=${markup}`);
      record('Every flag-off route ends under a locale with status 404', localePrefix && notFound === all.length, `not_found=${notFound} of ${all.length}`);
    } finally {
      await page.close();
    }
  }

  // ---------------------------------------------------------------- runs (a) and (b)
  if (run === 'a' || run === 'b') {
    const fileSteps = week.scripts.map(script => ({ day: script.day, ids: script.steps.map(step => step.id) }));
    // Each day 1 to 5 renders at 1920x1080 and 1366x768 with no horizontal scroll. The label is
    // `day=<n> steps=<n>`, and the step count must equal the count of the shipped week file (A4).
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
      for (const entry of fileSteps) {
        await runCheck(`day=${entry.day} steps=${entry.ids.length} renders at ${viewport.width}x${viewport.height} with no horizontal scroll`, async () => {
          const pg = await signedPage();
          try {
            await interceptMedia(pg);
            await openDay(pg, entry.day, viewport);
            const state = await walkDay(pg, entry.day);
            console.log(`day=${entry.day} steps=${state.ids.length} screens=${state.screens} viewport=${viewport.width}x${viewport.height} horizontal_scroll=${state.maxScrollWidth > 0 ? 1 : 0} step_ids=${state.ids.join(',')}`);
            const stepsOk = state.ids.length >= 1 && state.ids.join(',') === entry.ids.join(',');
            const scrollOk = state.maxScrollWidth === 0;
            return { ok: stepsOk && scrollOk, detail: `day=${entry.day} steps=${state.ids.length} expected_steps=${entry.ids.length} horizontal_scroll=${scrollOk ? 0 : 1}` };
          } finally {
            await pg.close();
          }
        });
      }
    }

    if (run === 'a') {
      // B1: the open player fits the viewport on the two media steps of the strategy, at each
      // viewport, and the page does not scroll sideways.
      for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
        for (const [day, id] of [[2, 'B3'], [4, 'D6']]) {
          await runCheck(`B1 player fits the viewport on ${id} at ${viewport.width}x${viewport.height}`, async () => {
            const pg = await signedPage();
            try {
              await interceptMedia(pg);
              await openDay(pg, day, viewport);
              if (!(await goToStep(pg, id))) throw new Error(`the step ${id} did not render`);
              await openPlayer(pg);
              const box = await pg.evaluate(() => {
                const player = document.querySelector('section[aria-label="The media player"]');
                if (!player) return null;
                player.scrollIntoView({ block: 'nearest' });
                const rect = player.getBoundingClientRect();
                // The cause of a tall player: the class-screen media box and the lyric list are
                // measured next to the player region, so a failure names what must shrink.
                const stage = document.querySelector('[data-mode="class-screen"] .song-stage, [data-mode="class-screen"] video');
                const lyrics = document.querySelector('[data-mode="class-screen"] ol');
                const stageRect = stage ? stage.getBoundingClientRect() : null;
                const lyricsRect = lyrics ? lyrics.getBoundingClientRect() : null;
                return {
                  w: Math.round(rect.width),
                  h: Math.round(rect.height),
                  bottom: Math.round(rect.bottom),
                  stageW: stageRect ? Math.round(stageRect.width) : 0,
                  stageH: stageRect ? Math.round(stageRect.height) : 0,
                  lyricsH: lyricsRect ? Math.round(lyricsRect.height) : 0,
                  scrollWidth: Math.round(document.documentElement.scrollWidth),
                  innerWidth: Math.round(window.innerWidth),
                  innerHeight: Math.round(window.innerHeight),
                };
              });
              console.log(`player_w=${box.w} player_h=${box.h} (step=${id}, viewport=${viewport.width}x${viewport.height}, player_bottom_px=${box.bottom}, viewport_height_px=${box.innerHeight}, media_box=${box.stageW}x${box.stageH}, lyrics_h=${box.lyricsH}, horizontal_scroll=${box.scrollWidth > box.innerWidth + 1 ? 1 : 0})`);
              const ok = box.w <= box.innerWidth && box.h <= box.innerHeight && box.scrollWidth <= box.innerWidth + 1;
              return { ok, detail: `player_w=${box.w} player_h=${box.h}` };
            } finally {
              await pg.close();
            }
          });
        }
      }

      // B2: the place of the step is kept after the player closes, on each of the 4 media steps.
      await runCheck('B2 the place of the step is kept after the player closes (place_kept=4)', async () => {
        const pg = await signedPage();
        try {
          await interceptMedia(pg);
          const kept = [];
          for (const [day, id] of [[2, 'B3'], [2, 'B7'], [4, 'D6'], [5, 'E2']]) {
            await openDay(pg, day, { width: 1920, height: 1080 });
            if (!(await goToStep(pg, id))) throw new Error(`the step ${id} did not render`);
            const before = await currentStep(pg);
            await openPlayer(pg);
            await pg.getByRole('button', { name: CLOSE, exact: true }).click();
            await pg.waitForTimeout(200);
            const after = await currentStep(pg);
            if (before === after) kept.push(id);
          }
          console.log(`place_kept=${kept.length} (steps=${kept.join(',')})`);
          return { ok: kept.length === 4, detail: `place_kept=${kept.length}` };
        } finally {
          await pg.close();
        }
      });

      // B3: the "Next step" control stays in the document while the player is open.
      await runCheck('B3 the "Next step" control stays while the player is open', async () => {
        const pg = await signedPage();
        try {
          await interceptMedia(pg);
          await openDay(pg, 2, { width: 1920, height: 1080 });
          if (!(await goToStep(pg, 'B3'))) throw new Error('the step B3 did not render');
          await openPlayer(pg);
          const visible = await pg.getByRole('button', { name: NEXT, exact: true }).count();
          const stepId = await currentStep(pg);
          console.log(`next_step_visible=${visible} (step=${stepId})`);
          return { ok: visible === 1 && stepId === 'B3', detail: `next_step_visible=${visible}` };
        } finally {
          await pg.close();
        }
      });

      // B4: keyboard only. Tab reaches the open control, Enter opens, Escape closes, and the focus
      // returns to the control that opened the player.
      await runCheck('B4 keyboard: Tab reaches the open control, Enter opens, Escape closes, focus returns', async () => {
        const pg = await signedPage();
        try {
          await interceptMedia(pg);
          await openDay(pg, 2, { width: 1920, height: 1080 });
          if (!(await goToStep(pg, 'B3'))) throw new Error('the step B3 did not render');
          await pg.evaluate(() => {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            document.body.setAttribute('tabindex', '-1');
            document.body.focus();
          });
          let reached = 0;
          for (let index = 0; index < 100; index += 1) {
            await pg.keyboard.press('Tab');
            const onOpen = await pg.evaluate(() => {
              const el = document.activeElement;
              return el?.tagName === 'BUTTON' && (el.textContent ?? '').trim() === 'Open media';
            });
            if (onOpen) { reached = 1; break; }
          }
          if (!reached) throw new Error('Tab reached no Open media control in 100 presses');
          await pg.keyboard.press('Enter');
          await pg.locator(PLAYER).waitFor({ timeout: 10000 });
          await pg.keyboard.press('Escape');
          await pg.waitForTimeout(250);
          const state = await pg.evaluate(() => ({
            playerOpen: Boolean(document.querySelector('section[aria-label="The media player"]')),
            focusText: (document.activeElement?.textContent ?? '').trim(),
          }));
          const returned = state.focusText === 'Open media' ? 1 : 0;
          console.log(`focus_returned=${returned} (tab_reached_open=${reached}, player_open_after_escape=${state.playerOpen ? 1 : 0}, focus_text=${JSON.stringify(state.focusText)})`);
          return { ok: returned === 1 && !state.playerOpen, detail: `focus_returned=${returned}` };
        } finally {
          await pg.close();
        }
      });

      // L1 and the loops-off half of S1: walk the five days once and read the values.
      const loopsOff = await runCheck('Walk the five days with the loops off', async () => {
        const pg = await signedPage();
        try {
          await interceptMedia(pg);
          const days = [];
          let stepTimeA1 = null;
          for (const entry of fileSteps) {
            await openDay(pg, entry.day, { width: 1920, height: 1080 });
            if (entry.day === 1) stepTimeA1 = await stepTimeMinutes(pg);
            days.push(await walkDay(pg, entry.day));
          }
          const loops = days.flatMap(state => state.loopSteps).length;
          const recalls = days.flatMap(state => state.recallDays).length;
          const moments = days.flatMap(state => state.moments).length;
          console.log(`loop_panels=${loops} recall_days=${recalls} step_time_a1=${stepTimeA1} min`);
          return { ok: true, value: { loops, recalls, moments, stepTimeA1 } };
        } finally {
          await pg.close();
        }
      });
      await runCheck('L1 loops off: no loop panel and no recall panel, and A1 reads 4 min', async () => {
        if (!loopsOff) throw new Error('the loops-off walk did not run');
        const ok = loopsOff.loops === 0 && loopsOff.recalls === 0 && loopsOff.stepTimeA1 === 4;
        console.log(`loops_off_clean=${ok ? 1 : 0} (loop_panels=${loopsOff.loops}, recall_days=${loopsOff.recalls}, step_time_a1=${loopsOff.stepTimeA1})`);
        return { ok, detail: `loop_panels=${loopsOff.loops} recall_days=${loopsOff.recalls} step_time_a1=${loopsOff.stepTimeA1}` };
      });
      await runCheck('S1 with the loops off: no share moment on any day', async () => {
        if (!loopsOff) throw new Error('the loops-off walk did not run');
        console.log(`share_shown_off=${loopsOff.moments}`);
        return { ok: loopsOff.moments === 0, detail: `share_shown_off=${loopsOff.moments}` };
      });
    }

    if (run === 'b') {
      // L2: with the approved copy, the panels show on A1 to A4, A6, and D2, and the recall shows
      // on days 2 to 5. A1 reads 5 min.
      const loopsOn = await runCheck('Walk the five days with the loops on', async () => {
        const pg = await signedPage();
        try {
          await interceptMedia(pg);
          const days = [];
          let stepTimeA1 = null;
          for (const entry of fileSteps) {
            await openDay(pg, entry.day, { width: 1920, height: 1080 });
            if (entry.day === 1) stepTimeA1 = await stepTimeMinutes(pg);
            days.push(await walkDay(pg, entry.day, { fonts: true }));
          }
          const loopSteps = days.flatMap(state => state.loopSteps);
          const soundloops = loopSteps.filter(entry => entry.endsWith(':sound-loop')).map(entry => entry.split(':')[0]);
          const drills = loopSteps.filter(entry => entry.endsWith(':blend-drill')).map(entry => entry.split(':')[0]);
          const sights = loopSteps.filter(entry => entry.endsWith(':sight-words')).map(entry => entry.split(':')[0]);
          const recallDays = [...new Set(days.flatMap(state => state.recallDays))].sort((a, b) => a - b);
          const moments = days.flatMap(state => state.moments);
          const fontMins = days.flatMap(state => state.fontMins);
          const maxScrollWidth = Math.max(0, ...days.map(state => state.maxScrollWidth));
          return {
            ok: true,
            value: { soundloops, drills, sights, recallDays, moments, stepTimeA1, fontMins, maxScrollWidth },
          };
        } finally {
          await pg.close();
        }
      });
      await runCheck('L2 loops on: the panels and the recall show, and A1 reads 5 min', async () => {
        if (!loopsOn) throw new Error('the loops-on walk did not run');
        const soundOk = loopsOn.soundloops.join(',') === 'A1,A2,A3';
        const drillOk = loopsOn.drills.join(',') === 'A4';
        const sightOk = loopsOn.sights.join(',') === 'A6,D2';
        const recallOk = loopsOn.recallDays.join(',') === '2,3,4,5';
        console.log(`soundloop_steps=${loopsOn.soundloops.length} blenddrill_steps=${loopsOn.drills.length} sightwords_steps=${loopsOn.sights.length} recall_days=${loopsOn.recallDays.length} step_time_a1=${loopsOn.stepTimeA1} (steps=${loopsOn.soundloops.concat(loopsOn.drills, loopsOn.sights).join(',')}, recall=${loopsOn.recallDays.join(',')})`);
        return { ok: soundOk && drillOk && sightOk && recallOk && loopsOn.stepTimeA1 === 5, detail: `soundloops=${loopsOn.soundloops.length} drills=${loopsOn.drills.length} sights=${loopsOn.sights.length} recall_days=${loopsOn.recallDays.length} step_time_a1=${loopsOn.stepTimeA1}` };
      });
      // L3: the loop panels and the recall at 1920x1080 hold body text of at least 18 px, and the
      // page does not scroll sideways.
      await runCheck('L3 the loop panels and the recall hold 18 px text at 1920x1080 with no horizontal scroll', async () => {
        if (!loopsOn) throw new Error('the loops-on walk did not run');
        const min = loopsOn.fontMins.length ? Math.min(...loopsOn.fontMins) : 0;
        const pages = loopsOn.fontMins.length;
        console.log(`min_font_px=${min} (measured_screens=${pages}, floor_px=18, horizontal_scroll=${loopsOn.maxScrollWidth > 0 ? 1 : 0})`);
        return { ok: pages > 0 && min >= 18 && loopsOn.maxScrollWidth === 0, detail: `min_font_px=${min} measured_screens=${pages}` };
      });
      // L4: the drill clip controls and the recall clip controls each reach 44x44 on the laptop view.
      await runCheck('L4 the drill and recall clip controls are at least 44x44 on the laptop view', async () => {
        const pg = await signedPage();
        try {
          await interceptMedia(pg);
          await openDay(pg, 1, { width: 1366, height: 768 });
          if (!(await goToStep(pg, 'A4'))) throw new Error('the step A4 did not render');
          const drill = await tapTargets(pg, '[data-loop="blend-drill"] [data-clip-path]');
          await openDay(pg, 2, { width: 1366, height: 768 });
          const recall = await tapTargets(pg, '[data-recall-day] [data-clip-path]');
          const targets = drill.count + recall.count;
          const smallest = targets ? Math.min(drill.min || Infinity, recall.min || Infinity) : 0;
          console.log(`targets=${targets} (drill_targets=${drill.count}, recall_targets=${recall.count}, min_side_px=${smallest}, floor_px=44, smallest=${JSON.stringify([...drill.items, ...recall.items].slice(0, 3))})`);
          return { ok: drill.count > 0 && recall.count > 0 && drill.min >= 44 && recall.min >= 44, detail: `targets=${targets} min_side_px=${smallest}` };
        } finally {
          await pg.close();
        }
      });
      // S1 with the loops on: the moment shows on A3, B5, C4, D4, and D5, and never on day 5.
      await runCheck('S1 with the loops on: the share moment shows on five steps and not on day 5', async () => {
        if (!loopsOn) throw new Error('the loops-on walk did not run');
        const shown = loopsOn.moments;
        const expected = ['A3', 'B5', 'C4', 'D4', 'D5'];
        const ok = shown.length === 5 && expected.every(id => shown.includes(id)) && !shown.includes('D6');
        console.log(`share_shown=${shown.length} (steps=${shown.join(',')})`);
        return { ok, detail: `share_shown=${shown.length} steps=${shown.join(',')}` };
      });
      // S2: the moment shows its caption and the consent line inside the 1920x1080 viewport, and
      // the run sends no POST.
      await runCheck('S2 the share moment holds its caption and consent line in the viewport, and the run sends no POST', async () => {
        const pg = await signedPage();
        try {
          await interceptMedia(pg);
          await openDay(pg, 1, { width: 1920, height: 1080 });
          if (!(await goToStep(pg, 'A3'))) throw new Error('the step A3 did not render');
          const moment = await pg.evaluate(() => {
            const node = document.querySelector('[data-share-moment]');
            if (!node) return null;
            node.scrollIntoView({ block: 'nearest' });
            const rect = node.getBoundingClientRect();
            const text = node.innerText;
            const caption = text.split('\n').map(line => line.trim()).filter(Boolean);
            return {
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              innerWidth: Math.round(window.innerWidth),
              innerHeight: Math.round(window.innerHeight),
              lines: caption,
              hasConsentLabel: Boolean(node.querySelector('[data-share-label]')),
            };
          });
          if (!moment) throw new Error('the share moment did not render at A3');
          console.log(`share_moment_w=${moment.w} share_moment_h=${moment.h} (lines=${moment.lines.length}, caption_and_consent=${moment.lines.length >= 3 ? 1 : 0}, inside_viewport=${moment.bottom <= moment.innerHeight && moment.w <= moment.innerWidth ? 1 : 0}, post_requests=${postRequests})`);
          const inside = moment.w <= moment.innerWidth && moment.h <= moment.innerHeight && moment.bottom <= moment.innerHeight;
          return { ok: inside && moment.lines.length >= 3 && postRequests === 0, detail: `w=${moment.w} h=${moment.h} lines=${moment.lines.length} post_requests=${postRequests}` };
        } finally {
          await pg.close();
        }
      });
    }
  }
} catch (error) {
  record('Browser gate completed without runtime errors', false, String(error));
} finally {
  await browser.close();
}
console.log(results.join('\n'));
console.log(`PASS=${pass}, FAIL=${fail}`);
if (fail) process.exitCode = 1;
NODE

echo "=== Run (a): teacher flag on, draft loops copy ==="
if start_server "$DRAFT_DIR" "1"; then
  pass "Run (a) server answers on port $SERVER_PORT"
  if run_browser a "$DRAFT_DIR/l2/w01.json"; then pass "Run (a) Playwright gate exits 0"; else fail "Run (a) Playwright gate failed"; fi
else
  fail "Run (a) server did not become ready"
  cat "$SERVER_LOG"
fi
stop_server_group

echo "=== Run (b): teacher flag on, approved loops copy ==="
if start_server "$APPROVED_DIR" "1"; then
  pass "Run (b) server answers on port $SERVER_PORT"
  if run_browser b "$APPROVED_DIR/l2/w01.json"; then pass "Run (b) Playwright gate exits 0"; else fail "Run (b) Playwright gate failed"; fi
else
  fail "Run (b) server did not become ready"
  cat "$SERVER_LOG"
fi
stop_server_group

echo "=== Run (c): teacher flag not set ==="
if start_server "$OFF_DIR" ""; then
  pass "Run (c) server answers on port $SERVER_PORT"
  if run_browser c "$OFF_DIR/l2/w01.json"; then pass "Run (c) Playwright gate exits 0"; else fail "Run (c) Playwright gate failed"; fi
else
  fail "Run (c) server did not become ready"
  cat "$SERVER_LOG"
fi
stop_server_group

printf '%s\n' "${RESULTS[@]}"
echo "PASS=$PASS_COUNT, FAIL=$FAIL_COUNT"
exit "$FAILED"
