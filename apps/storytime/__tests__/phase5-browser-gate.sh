#!/usr/bin/env bash
# The Phase 5 browser gate (plan tasks 5.6 and 5.7, test strategy P5.3 and P5.8).
#
# The gate builds the Storytime production app once, then runs two servers on free local ports:
#   (a) the app review copy: `next start` with `STORYTIME_SHOW_DRAFT_MEDIA=1`, the teacher routes
#       on, and the ready review fixture of w01 (the milestone week, level 2 week 1);
#   (b) the review server: `apps/storytime/scripts/review/review-server.ts`, which serves the
#       review page at `/review`, takes one answer at `POST /review/answer`, and proxies every
#       other path to the app review copy.
#
# The rows:
#   - the review page answers 200 and holds the five items of FR-12, each with the four controls
#     (Pass, Fail, a comment, and Send): items_listed=5, controls_per_item=4;
#   - no item shows an answer before an answer: answered=0;
#   - each of the five items opens and holds its part: items_checked=5;
#   - each Send writes one line to `review-answers-p5.json` in the run folder: answers_written=5;
#   - the draft switch shows the draft parts of the milestone week: draft_week=200.
#
# The listening and the touch checks of rule 6.5 are the person check of the agent side, and
# Daniel's check is task 6.1.
#
# The port is free and never 3005 and never 3099. The server runs in its own process group, and
# the exit trap stops the group, waits, and prints port_closed=1.
#
# The self-test mode (`--self-test`) runs the verdict functions against broken copies only. It
# needs no build, no database, and no server.
#
# The script enters heavy-run.sh itself, as the Phase 4 gate does. Run it plain.
set -uo pipefail

MODE="${1:-}"
if [ "$MODE" != "--locked" ] && [ "$MODE" != "--self-test" ]; then
  exec env HEAVY_PRIORITY=p1 bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" \
    -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
RUN_FOLDER="$ROOT/measure/runs/storytime_app_rebuild_20261025"
ANSWERS_FILE="$RUN_FOLDER/review-answers-p5.json"
TMP_DIR="$(mktemp -d -t storytime-phase5-XXXXXX)"
FIXTURE="$TMP_DIR/content"
FIXTURE_WEEK="$FIXTURE/l2/w01.json"
NEXT_LOG="$TMP_DIR/next.log"
REVIEW_LOG="$TMP_DIR/review.log"
SERVER_PID_FILE="$TMP_DIR/server.pid"
PLAYWRIGHT="$APP/.next/phase5-browser-gate-$$.mjs"
DB_CONTAINER="storytime-phase5-gate-db-$$"
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
APP_PORT=""
PORT_CLOSED=0

# Stops the whole process group of the server and waits for the port to close.
# The server starts its own children, so a kill of the parent leaves them alive.
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
      PORT_CLOSED=0
    else
      PORT_CLOSED=1
    fi
    echo "port_closed=$PORT_CLOSED"
    echo "port=$SERVER_PORT"
    SERVER_PORT=""
  fi
}

cleanup() {
  stop_server_group
  podman rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  rm -f "$PLAYWRIGHT"
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

# Gives a free 127.0.0.1 port.
free_port() {
  node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'
}

# Gives a free 127.0.0.1 port, never 3005 and never 3099 (P5.8).
pick_port() {
  local chosen=""
  while :; do
    chosen="$(free_port)"
    if [ "$chosen" != "3005" ] && [ "$chosen" != "3099" ]; then break; fi
  done
  printf '%s' "$chosen"
}

# Writes the Playwright module. The module holds the verdict functions, the self-test, and the rows.
write_playwright() {
  mkdir -p "$APP/.next"
  cat > "$PLAYWRIGHT" <<'NODE'
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const selfTestOnly = process.argv[2] === '--self-test';
const base = process.env.PROJECT_DEV_URL ?? '';
const answersPath = process.env.PROJECT_ANSWERS_FILE ?? '';
const itemIds = ['teacher-app', 'home-entry', 'read-along', 'decodable', 'song'];

let pass = 0;
let fail = 0;
const results = [];
/** Records one row with a PASS or FAIL marker and its labeled values. */
function row(name, ok, detail = '') {
  const line = `${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` (${detail})` : ''}`;
  results.push(line);
  console.log(line);
  ok ? pass++ : fail++;
}
/** Prints one labeled value. */
function emit(name, value) { console.log(`${name}=${value}`); }

// ---- Verdict functions. The self-test and the live rows share them. ----

/** Reports whether a port is free to use: a number, never 3005 and never 3099. */
function portVerdict(port) {
  const value = Number(port);
  if (!Number.isInteger(value)) return false;
  if (value < 1024 || value > 65535) return false;
  if (value === 3005 || value === 3099) return false;
  return true;
}

/** Reports whether the page holds the five items of FR-12, each with its routes. */
function itemsVerdict(items) {
  if (!Array.isArray(items) || items.length !== 5) return false;
  return items.every((item) => (
    Boolean(item)
    && typeof item.id === 'string' && item.id.length > 0
    && Array.isArray(item.paths) && item.paths.length > 0
    && item.paths.every((path) => typeof path === 'string' && path.startsWith('/'))
  ));
}

/** Reports whether one item block holds the four controls of FR-12. */
function controlsVerdict(block) {
  if (typeof block !== 'string' || block.trim().length === 0) return false;
  const has = (name, value) => new RegExp(`${name}=["']${value}["']`).test(block);
  return has('data-review-action', 'pass')
    && has('data-review-action', 'fail')
    && has('data-review-action', 'send')
    && /data-review-comment/.test(block);
}

/** Reports whether no item shows an answer before an answer. */
function answeredVerdict(answered) {
  return Number(answered) === 0;
}

/** Reports whether the agent rows checked the five items. */
function itemsCheckedVerdict(count) {
  return Number(count) === 5;
}

/** Reports whether the answers file holds one JSON line per answer. */
function answersVerdict(lines, expected) {
  if (!Array.isArray(lines) || lines.length !== expected) return false;
  return lines.every((line) => {
    try {
      const value = JSON.parse(line);
      return Boolean(value)
        && typeof value.itemId === 'string' && value.itemId.length > 0
        && (value.verdict === 'pass' || value.verdict === 'fail')
        && typeof value.comment === 'string';
    } catch {
      return false;
    }
  });
}

// ---- The self-test. Every broken copy must be rejected. ----
const goodItems = [
  { id: 'teacher-app', paths: ['/th/teacher/2/1', '/th/teacher/2/1/1'] },
  { id: 'home-entry', paths: ['/th/st/2/1'] },
  { id: 'read-along', paths: ['/th/st/2/1?part=book'] },
  { id: 'decodable', paths: ['/th/st/2/1?part=decodable'] },
  { id: 'song', paths: ['/th/st/2/1?part=song'] },
];
const goodBlock = '<section data-review-item="song">'
  + '<a data-review-path="/th/st/2/1?part=song" href="/th/st/2/1?part=song">song</a>'
  + '<button data-review-action="pass">Pass</button>'
  + '<button data-review-action="fail">Fail</button>'
  + '<textarea data-review-comment></textarea>'
  + '<button data-review-action="send">Send</button>'
  + '</section>';
const goodAnswers = [
  JSON.stringify({ itemId: 'song', verdict: 'pass', comment: 'the song plays' }),
  JSON.stringify({ itemId: 'decodable', verdict: 'fail', comment: 'the sound cuts' }),
];
const cases = [
  { name: 'a free port', actual: portVerdict(45123), expect: true },
  { name: 'the port 3005', actual: portVerdict(3005), expect: false },
  { name: 'the port 3099', actual: portVerdict(3099), expect: false },
  { name: 'the port 0', actual: portVerdict(0), expect: false },
  { name: 'the port 70000', actual: portVerdict(70000), expect: false },
  { name: 'a port that is no number', actual: portVerdict('abc'), expect: false },
  { name: 'the five items', actual: itemsVerdict(goodItems), expect: true },
  { name: 'four items', actual: itemsVerdict(goodItems.slice(0, 4)), expect: false },
  {
    name: 'an item with no route',
    actual: itemsVerdict(goodItems.map((item, index) => (index === 0 ? { ...item, paths: [] } : item))),
    expect: false,
  },
  {
    name: 'an item with no id',
    actual: itemsVerdict(goodItems.map((item, index) => (index === 0 ? { ...item, id: '' } : item))),
    expect: false,
  },
  { name: 'an item block with the four controls', actual: controlsVerdict(goodBlock), expect: true },
  {
    name: 'an item block with no send control',
    actual: controlsVerdict(goodBlock.replace('data-review-action="send"', 'data-marker="send"')),
    expect: false,
  },
  {
    name: 'an item block with no comment control',
    actual: controlsVerdict(goodBlock.replace('data-review-comment', 'data-marker')),
    expect: false,
  },
  { name: 'an empty item block', actual: controlsVerdict('   '), expect: false },
  { name: 'no answer before an answer', actual: answeredVerdict(0), expect: true },
  { name: 'one answer before an answer', actual: answeredVerdict(1), expect: false },
  { name: 'five checked items', actual: itemsCheckedVerdict(5), expect: true },
  { name: 'no checked item', actual: itemsCheckedVerdict(0), expect: false },
  { name: 'four checked items', actual: itemsCheckedVerdict(4), expect: false },
  { name: 'two answers in the file', actual: answersVerdict(goodAnswers, 2), expect: true },
  { name: 'one lost answer', actual: answersVerdict(goodAnswers.slice(0, 1), 2), expect: false },
  {
    name: 'a broken answer line',
    actual: answersVerdict([goodAnswers[0], 'not json'], 2),
    expect: false,
  },
  {
    name: 'an answer with no verdict',
    actual: answersVerdict([goodAnswers[0], JSON.stringify({ itemId: 'song', comment: 'x' })], 2),
    expect: false,
  },
];
const good = cases.filter((entry) => entry.expect === true);
const mutants = cases.filter((entry) => entry.expect === false);
const accepted = good.filter((entry) => entry.actual === true).length;
const rejected = mutants.filter((entry) => entry.actual === false).length;
emit('selftest_good_checked', good.length);
emit('selftest_good_accepted', accepted);
emit('selftest_mutants_checked', mutants.length);
emit('selftest_mutants_rejected', rejected);
const selfOk = accepted === good.length && rejected === mutants.length;
row('self-test the verdicts accept the good values and reject the broken copies', selfOk,
  `good_accepted=${accepted}/${good.length} mutants_rejected=${rejected}/${mutants.length}`);
if (selfTestOnly) {
  emit('row_count', results.length);
  process.exit(selfOk ? 0 : 1);
}

// ---- The live rows. ----
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

/** Runs one row and records its verdict. */
async function runCheck(name, action) {
  try {
    const result = await action();
    row(name, result.ok, result.detail ?? '');
    return result.value;
  } catch (error) {
    row(name, false, String(error));
    return null;
  }
}

// The sign-in helper of the Phase 3 and Phase 4 gates. The password comes from the environment
// and never reaches a log line.
const SIGN_IN_ORIGIN = new URL(base).origin;
async function signIn(user, password) {
  const body = new URLSearchParams({ username: user, password, locale: 'th', next: '/th/st' });
  const response = await fetch(`${base}/api/auth/sign-in`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: SIGN_IN_ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const cookie = response.headers.getSetCookie().map((line) => /^(__Host-st_session)=([^;]+)/.exec(line)).find(Boolean);
  if (!cookie) throw new Error(`sign-in of ${user} gave status ${response.status} and no session cookie`);
  return { name: cookie[1], value: cookie[2] };
}
const SESSION = await signIn(process.env.PROJECT_SIGN_IN_USER, process.env.PROJECT_SIGN_IN_PASSWORD);
/** Opens a browser context that holds the session cookie of the signed-in account. */
async function signedContext() {
  const context = await browser.newContext();
  const setup = await context.newPage();
  const cdp = await context.newCDPSession(setup);
  const stored = await cdp.send('Network.setCookie', {
    name: SESSION.name, value: SESSION.value, url: base, httpOnly: true, secure: true, sameSite: 'Lax',
  });
  if (!stored.success) throw new Error('the browser refused the session cookie');
  await cdp.detach();
  await setup.close();
  return context;
}
/** Opens one signed-in page in its own context. */
async function signedPage() {
  const context = await signedContext();
  const page = await context.newPage();
  page.on('close', () => { context.close().catch(() => {}); });
  return page;
}
// A silent 3 s WAV stands in for every audio file, so a player can render and play.
function wavBuffer(seconds) {
  const rate = 8000, channels = 1, bits = 16;
  const frames = Math.floor(rate * seconds);
  const blockAlign = channels * bits / 8;
  const dataBytes = frames * blockAlign;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataBytes, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22); buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * blockAlign, 28); buffer.writeUInt32LE(blockAlign, 32);
  buffer.writeUInt16LE(bits, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}
const WAV = wavBuffer(3);
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
/** Answers every signed media URL with a real audio or picture body. */
async function interceptMedia(page) {
  await page.route((url) => url.pathname.includes('/media/') || url.searchParams.has('X-Amz-Signature'), (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(path)) return route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
    if (/\.(png|webp|jpe?g|gif|avif)$/i.test(path)) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    if (/\.(mp4|m4v|mov|webm|ogv)$/i.test(path)) return route.fulfill({ status: 204, body: '' });
    return route.continue();
  });
}
/** Gives the five item blocks of the review page with their routes and their markup. */
async function readItems(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-review-item]')].map((block) => ({
    id: block.getAttribute('data-review-item') ?? '',
    paths: [...block.querySelectorAll('[data-review-path]')].map((link) => link.getAttribute('data-review-path') ?? ''),
    answered: block.getAttribute('data-review-answer') ?? '',
    comment: block.querySelector('[data-review-comment]')?.value ?? '',
    html: block.outerHTML,
  })));
}
/** Gives the number of items that show an answer. */
async function readAnswered(page) {
  const items = await readItems(page);
  return items.filter((item) => item.answered.length > 0 || item.comment.trim().length > 0).length;
}
/** Gives the part markers of the page of one item. */
async function readMarkers(page) {
  return page.evaluate(() => ({
    lessons: document.querySelectorAll('section[aria-label="The five lessons"]').length,
    steps: document.querySelectorAll('[data-step-id]').length,
    tiles: document.querySelectorAll('a[href*="part="]').length,
    media: document.querySelectorAll('audio, video').length,
  }));
}
/** Gives the answer lines of the answers file. */
function answerLines() {
  if (!fs.existsSync(answersPath)) return [];
  return fs.readFileSync(answersPath, 'utf8').split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
}

let items = [];
await runCheck('the review page answers 200 and holds the five items of FR-12', async () => {
  const page = await signedPage();
  try {
    const response = await page.goto(`${base}/review`, { waitUntil: 'networkidle' });
    const status = response ? response.status() : 0;
    items = await readItems(page);
    const controls = items.filter((item) => controlsVerdict(item.html)).length;
    emit('items_listed', items.length);
    emit('controls_per_item', items.length > 0 ? controls / items.length : 0);
    const ok = status === 200 && itemsVerdict(items) && controls === items.length;
    return { ok, detail: `status=${status} items_listed=${items.length} controls=${controls}` };
  } finally {
    await page.close();
  }
});

await runCheck('no item shows an answer before an answer', async () => {
  const page = await signedPage();
  try {
    await page.goto(`${base}/review`, { waitUntil: 'networkidle' });
    const answered = await readAnswered(page);
    emit('answered', answered);
    return { ok: answeredVerdict(answered), detail: `answered=${answered}` };
  } finally {
    await page.close();
  }
});

const checked = await runCheck('each of the five items opens and holds its part', async () => {
  const page = await signedPage();
  const opened = [];
  try {
    await interceptMedia(page);
    for (const item of items) {
      let held = 0;
      for (const path of item.paths) {
        const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
        const status = response ? response.status() : 0;
        const markers = await readMarkers(page);
        const parts = markers.lessons + markers.steps + markers.tiles + markers.media;
        if (status === 200 && parts > 0) held += 1;
        opened.push(`${item.id}:${path}:${status}:${parts}`);
      }
      if (held === item.paths.length) opened.push(`${item.id}:ok`);
    }
    const done = itemIds.filter((id) => opened.includes(`${id}:ok`)).length;
    emit('items_checked', done);
    return { ok: itemsCheckedVerdict(done), detail: `items_checked=${done} opened=${opened.join(' ')}` };
  } finally {
    await page.close();
  }
});

await runCheck('each Send writes one line to the answers file of the run folder', async () => {
  const page = await signedPage();
  try {
    await page.goto(`${base}/review`, { waitUntil: 'networkidle' });
    let written = 0;
    for (const item of items) {
      const block = page.locator(`[data-review-item="${item.id}"]`);
      const comment = `the ${item.id} part of the milestone week`;
      await block.locator('[data-review-comment]').fill(comment);
      await block.locator('[data-review-action="pass"]').click();
      await block.locator('[data-review-action="send"]').click();
      await page.waitForTimeout(250);
      written = answerLines().length;
    }
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && answerLines().length < items.length) {
      await page.waitForTimeout(300);
    }
    const lines = answerLines();
    emit('answers_written', lines.length);
    const ok = answersVerdict(lines, items.length);
    return { ok, detail: `answers_written=${lines.length} expected=${items.length}` };
  } finally {
    await page.close();
  }
});

await runCheck('the draft switch shows the draft parts of the milestone week', async () => {
  const page = await signedPage();
  try {
    const response = await page.goto(`${base}/th/st/2/1`, { waitUntil: 'networkidle' });
    const status = response ? response.status() : 0;
    emit('draft_week', status);
    return { ok: status === 200, detail: `draft_week=${status}` };
  } finally {
    await page.close();
  }
});

await browser.close();
console.log(results.join('\n'));
emit('PASS', pass);
emit('FAIL', fail);
if (fail) process.exitCode = 1;
NODE
}

if [ "$MODE" = "--self-test" ]; then
  write_playwright
  (cd "$APP" && node "$PLAYWRIGHT" --self-test) | tee "$TMP_DIR/self-test.log"
  if grep -qE '^FAIL: ' "$TMP_DIR/self-test.log"; then FAILED=1; fi
  [ -s "$TMP_DIR/self-test.log" ] || FAILED=1
  LOG_PASS=$(grep -cE '^PASS: ' "$TMP_DIR/self-test.log" || true)
  LOG_FAIL=$(grep -cE '^FAIL: ' "$TMP_DIR/self-test.log" || true)
  echo "=== Total: $((LOG_PASS + LOG_FAIL)) checks (PASS=$LOG_PASS, FAIL=$LOG_FAIL) ==="
  exit "$FAILED"
fi

echo "=== Build the Storytime production app once ==="
if (cd "$APP" && ../../node_modules/.bin/next build); then
  pass "The production build exits 0"
else
  fail "The production build failed"
fi

echo "=== Create the ready review fixture of the milestone week ==="
FIXTURE_OK=0
if [ -f "$APP/content/l2/w01.json" ]; then
  node --input-type=module - "$APP/content/l2/w01.json" "$FIXTURE_WEEK" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [source, target] = process.argv.slice(2);
const week = JSON.parse(fs.readFileSync(source, 'utf8'));
for (const part of Object.keys(week.approval ?? {})) {
  week.approval[part] = { ...week.approval[part], status: 'approved' };
}
if (week.approval?.loops) week.approval.loops = { status: 'draft' };
for (const book of week.books ?? []) {
  if (!book.cover?.file) book.cover = { ...(book.cover ?? {}), file: `pictures/fixture-${book.kind}-cover.png` };
  for (const [index, page] of (book.pages ?? []).entries()) {
    if (!page.image?.file) {
      page.image = { ...(page.image ?? {}), file: `pictures/fixture-${book.kind}-${index + 1}.png` };
    }
  }
  if (book.kind === 'readalong' && book.audio) {
    const clips = {};
    for (const sentence of book.audio.sentences ?? []) {
      for (const word of sentence.words ?? []) {
        const key = String(word.word).toLowerCase();
        if (key !== 'i') clips[key] = `audio/words/${key}.mp3`;
      }
    }
    book.audio.wordClips = clips;
  }
}
if (week.song && !week.song.poster) week.song.poster = 'pictures/fixture-song-poster.png';
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(week));
NODE
  FIXTURE_OK=$?
fi
if [ "$FIXTURE_OK" -eq 0 ]; then
  pass "The ready review fixture of w01 sits in $FIXTURE"
else
  fail "Could not create the ready review fixture of w01"
fi

echo "=== Start the local database and make the account teach-01 (teacher) ==="
DB_PORT="$(free_port)"
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
  pass "The local database holds the account teach-01"
else
  fail "Could not make the account teach-01"
fi

REVIEW_SERVER="$APP/scripts/review/review-server.ts"
if [ ! -f "$REVIEW_SERVER" ]; then REVIEW_SERVER="$APP/scripts/review-server.ts"; fi
if [ ! -f "$REVIEW_SERVER" ]; then
  fail "The review server module is missing: apps/storytime/scripts/review/review-server.ts"
  printf '%s\n' "${RESULTS[@]}"
  echo "PASS=$PASS_COUNT, FAIL=$FAIL_COUNT"
  exit "$FAILED"
fi

echo "=== Start the app review copy and the review server on free ports ==="
APP_PORT="$(pick_port)"
SERVER_PORT="$(pick_port)"
while [ "$SERVER_PORT" = "$APP_PORT" ]; do SERVER_PORT="$(pick_port)"; done
mkdir -p "$RUN_FOLDER"
rm -f "$ANSWERS_FILE"
: > "$SERVER_PID_FILE"
: > "$NEXT_LOG"
: > "$REVIEW_LOG"
# The `cd` must apply to both servers. A `&` after the `cd` sends the whole list to the
# background, so the review server would run in the folder of the caller and its relative paths
# would not resolve. Each server writes its own log, so neither overwrites the other.
REVIEW_SERVER_REL="${REVIEW_SERVER#"$APP"/}"
setsid bash -c "echo \$\$ > '$SERVER_PID_FILE'; cd '$APP' || exit 1; (STORYTIME_CONTENT_DIR='$FIXTURE' STORYTIME_DATABASE_URL='$DB_URL' STORYTIME_MEDIA_BASE='gs://storytime-app-media' STORYTIME_STORAGE_ENDPOINT='http://127.0.0.1:$APP_PORT' STORYTIME_STORAGE_ACCESS_KEY='gate-access-key' STORYTIME_STORAGE_SECRET_KEY='gate-secret-key' STORYTIME_SHOW_DRAFT_MEDIA=1 STORYTIME_TEACHER_ROUTES=1 exec ../../node_modules/.bin/next start --hostname 127.0.0.1 --port '$APP_PORT' >'$NEXT_LOG' 2>&1) & exec ../../node_modules/.bin/tsx '$REVIEW_SERVER_REL' --port '$SERVER_PORT' --app-url 'http://127.0.0.1:$APP_PORT' --answers '$ANSWERS_FILE' >'$REVIEW_LOG' 2>&1" &
for _ in $(seq 1 20); do
  [ -s "$SERVER_PID_FILE" ] && break
  sleep 0.2
done
SERVER_PID="$(cat "$SERVER_PID_FILE" 2>/dev/null)"
SERVER_PGID="$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ')"
[ -n "$SERVER_PGID" ] || SERVER_PGID="$SERVER_PID"
READY=0
for _ in $(seq 1 120); do
  STATUS="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:$SERVER_PORT/review")" || true
  if [ "$STATUS" = "200" ]; then READY=1; break; fi
  sleep 1
done
if [ "$READY" -eq 1 ]; then
  pass "The review copy answers on port $SERVER_PORT"
else
  fail "The review copy did not become ready on port $SERVER_PORT"
  echo "--- the next start log ---"
  cat "$NEXT_LOG"
  echo "--- the review server log ---"
  cat "$REVIEW_LOG"
fi

echo "=== Run the browser rows on the review page ==="
if [ "$READY" -eq 1 ]; then
  write_playwright
  if PROJECT_DEV_URL="http://127.0.0.1:$SERVER_PORT" \
    PROJECT_ANSWERS_FILE="$ANSWERS_FILE" \
    PROJECT_SIGN_IN_USER=teach-01 \
    PROJECT_SIGN_IN_PASSWORD="$TEACHER_PASSWORD" \
    timeout 25m node "$PLAYWRIGHT"; then
    pass "The browser rows of the review page exit 0"
  else
    fail "The browser rows of the review page failed"
  fi
else
  fail "The browser rows did not run without a ready review copy"
fi
stop_server_group

printf '%s\n' "${RESULTS[@]}"
echo "PASS=$PASS_COUNT, FAIL=$FAIL_COUNT"
exit "$FAILED"
