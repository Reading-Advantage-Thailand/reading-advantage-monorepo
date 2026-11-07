#!/usr/bin/env bash
set -uo pipefail

if [ "${1:-}" != "--locked" ]; then
  exec bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
PORT="${PHASE3_BROWSER_PORT:-}"
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
TMP_DIR="$(mktemp -d -t storytime-browser-XXXXXX)"
SERVER_LOG="$TMP_DIR/next-start.log"
SERVER_PID_FILE="$TMP_DIR/server.pid"
FIXTURE="$TMP_DIR/content"
PLAYWRIGHT="$APP/.next/phase3-browser-gate-$$.mjs"

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
}

cleanup() {
  stop_server_group
  rm -f "$PLAYWRIGHT"
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

echo "=== Build Storytime production app ==="
if (cd "$APP" && ../../node_modules/.bin/next build); then pass "Production build exits 0"; else fail "Production build failed"; fi

echo "=== Create ready review fixtures from shipped w01 and w03 ==="
if [ -f "$APP/content/l2/w01.json" ] && [ -f "$APP/content/l2/w03.json" ]; then
  mkdir -p "$FIXTURE/l2"
  node --input-type=module - "$APP/content/l2" "$FIXTURE/l2" "$FIXTURE" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [source, targetDir, root] = process.argv.slice(2);
const media = new Set();
fs.mkdirSync(targetDir, { recursive: true });
for (const name of ['w01.json', 'w03.json', 'w04.json']) {
  const week = JSON.parse(fs.readFileSync(path.resolve(source, name), 'utf8'));
  // Every approval part holds status approved. An approved loops part needs the date and the
  // exact words of the approval (the week contract), so the fixture fills both.
  for (const part of Object.keys(week.approval)) {
    week.approval[part] = { ...week.approval[part], status: 'approved' };
  }
  if (week.approval.loops) {
    week.approval.loops = { ...week.approval.loops, date: '2026-11-05', words: 'fixture approval for the browser gate' };
  }
  // The end-of-book landscape row needs a ready week with a draft loops part, so the reader
  // end view (F149, F282) is the screen at the end of the book, with no question screen. The
  // three end tiles also need their pictures, because a tile picture sets the tile height.
  if (name === 'w04.json') {
    for (const book of week.books ?? []) {
      book.cover = { file: `pictures/fixture-w04-cover-${book.kind}.png`, caption: '' };
    }
    if (week.song) week.song.poster = 'pictures/fixture-w04-song-poster.png';
  }
  if (name === 'w04.json' && week.approval.loops) {
    week.approval.loops = { status: 'draft' };
  }
  // The blend row needs a published week with a blend word; w03 ships as a draft, so the fixture
  // copy publishes it. The end-of-book row needs a second published week, so w04 is published
  // too (fixture only, like the approvals above; shipped files stay untouched).
  if ((name === 'w04.json' || name === 'w03.json') && week.meta) {
    week.meta.status = 'published';
  }
  // w03 ships with page pictures that hold no file yet, and the readiness rule blocks such a
  // week. The fixture copy gives those pages placeholder picture entries (fixture only).
  for (const book of week.books ?? []) {
    for (const [index, page] of (book.pages ?? []).entries()) {
      if (!page.image?.file) {
        page.image = { caption: '', file: `pictures/fixture-${name.replace('.json', '')}-${book.kind}-${index + 1}.png` };
      }
    }
  }
  function collect(value) {
    if (Array.isArray(value)) return value.forEach(collect);
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key === 'file' && typeof item === 'string') media.add(item);
      else collect(item);
    }
  }
  collect(week);
  fs.writeFileSync(path.resolve(targetDir, name), JSON.stringify(week));
}
for (const name of media) {
  const file = path.resolve(root, name);
  if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`unsafe fixture path: ${name}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // A picture is a valid 1x1 PNG so it takes its layout height (the landscape row of finding
  // F150 needs a real picture); audio and other files keep the small placeholder bytes.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  fs.writeFileSync(file, name.endsWith('.mp3') ? Buffer.from('ID3') : /\.(png|webp|jpe?g|gif|avif)$/i.test(name) ? png : Buffer.from('fixture'));
}
NODE
  FIXTURE_RC=$?
else
  FIXTURE_RC=1
fi
if [ "$FIXTURE_RC" -eq 0 ]; then pass "Ready clones use shipped w01, w03, and w04 with approvals and placeholder media"; else fail "Could not create ready review fixtures"; fi
echo "=== Fixture mode: STORYTIME_CONTENT_DIR points to a temporary ready review copy; draft-media switch is not set ==="

echo "=== Start next start on a free 127.0.0.1 port ==="
if [ -z "$PORT" ]; then
  PORT="$(node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
fi
setsid bash -c "echo \$\$ > '$SERVER_PID_FILE'; cd '$APP' && STORYTIME_CONTENT_DIR='$FIXTURE' exec ../../node_modules/.bin/next start --hostname 127.0.0.1 --port '$PORT' >'$SERVER_LOG' 2>&1" &
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
  STATUS="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:$PORT/th/st/2/1")" || true
  if [ "$STATUS" != "000" ]; then READY=1; break; fi
  sleep 1
done
if [ "$READY" -eq 1 ]; then pass "Built server answers HTTP $STATUS"; else fail "Built server did not become ready"; cat "$SERVER_LOG"; fi

cat > "$PLAYWRIGHT" <<'NODE'
import { chromium } from '@playwright/test';
import http from 'node:http';
const base = process.env.PROJECT_DEV_URL;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
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
function area(box) { return box ? Math.min(box.width, box.height) : 0; }
// The P3.6 week-404 row (PM 2026-11-05, option a; test strategy line 402). The server curl
// document of a pre-stream notFound() is the Next.js error shell without `lang`, so the row
// asserts the hydrated document in a real browser: the network response status is 404, the
// `document.documentElement.lang` after load equals the URL locale, and both the Thai and the
// English line of not-found.tsx show. Used by the live row and by the lang self-test.
async function checkWeek404(p, url, expectedLocale) {
  const response = await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1200); // let hydration re-render the layout over the error shell
  const status = response ? response.status() : null;
  const lang = await p.evaluate(() => document.documentElement.lang);
  const thai = await p.evaluate(() => document.body.innerText.includes('ไม่พบหน้านี้'));
  const english = await p.evaluate(() => document.body.innerText.includes('This page is not here'));
  console.log(`week404_status=${status}`);
  console.log(`week404_lang=${lang} (expected=${expectedLocale})`);
  console.log(`week404_thai_text=${thai}`);
  console.log(`week404_english_text=${english}`);
  return { ok: status === 404 && lang === expectedLocale && thai && english, detail: `status=${status} lang=${lang} thai=${thai} english=${english}` };
}
// A silent 3 s WAV that stands in for every media file, so the live playback rows
// (the blend clip count and the word cut) run on real decoded audio. The length keeps a
// three-clip blend sequence well inside the row timeout.
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
/** Answers every audio file under the media base with the WAV, so the elements decode and play. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
async function interceptMedia(pg) {
  await pg.route('**/media/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (/\.mp3$/i.test(path)) return route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
    // The built app serves no static media, so a page picture would 404 and take no layout
    // height. A valid 1x1 PNG gives every picture its layout box, which the landscape row of
    // finding F150 needs (a 1:1 picture is as tall as its container is wide).
    if (/\.(png|webp|jpe?g|gif|avif)$/i.test(path)) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    }
    return route.continue();
  });
}
const INTERACTIVE = 'button, a[href], [role="button"], [data-word], audio[aria-label]';
async function minTapSide(pg, selector = INTERACTIVE) {
  return pg.evaluate(sel => {
    const items = [...document.querySelectorAll(sel)].map(n => {
      const r = n.getBoundingClientRect();
      return {
        side: (r.width > 0 && r.height > 0) ? Math.min(r.width, r.height) : Infinity,
        tag: n.tagName.toLowerCase(),
        desc: (n.getAttribute('aria-label') ?? n.textContent ?? '').trim().slice(0, 20),
        cls: (n.getAttribute('class') ?? '').slice(0, 60),
        width: Math.round(r.width), height: Math.round(r.height),
      };
    }).filter(item => Number.isFinite(item.side));
    const smallest = items.length ? items.reduce((a, b) => (a.side <= b.side ? a : b)) : null;
    return {
      count: items.length,
      min: items.length ? Math.floor(Math.min(...items.map(item => item.side))) : 0,
      smallest: smallest ? `${smallest.tag}[${smallest.cls}] ${smallest.width}x${smallest.height} "${smallest.desc}"` : 'none',
    };
  }, selector);
}
async function duplicateIdCount(pg) {
  return pg.evaluate(() => {
    const seen = new Map(); let duplicates = 0;
    for (const el of document.querySelectorAll('[id]')) {
      const count = (seen.get(el.id) ?? 0) + 1;
      seen.set(el.id, count);
      if (count === 2) duplicates += 1;
    }
    return { duplicates, ids: seen.size };
  });
}
/** Tabs through one page and collects the focused targets without a visible focus indicator. */
async function focusVisibleFailures(pg, maxTabs = 40) {
  const seen = new Set(); const failures = [];
  for (let i = 0; i < maxTabs; i += 1) {
    await pg.keyboard.press('Tab');
    const info = await pg.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const ring = cs.boxShadow && cs.boxShadow !== 'none';
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      return { key: `${el.tagName}:${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}`, visible: Boolean(ring || outline) };
    });
    if (!info || seen.has(info.key)) break;
    seen.add(info.key);
    if (!info.visible) failures.push(info.key);
  }
  return { count: seen.size, failures };
}
function ratio(fg, bg) {
  const lum = (rgb) => {
    const c = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
  };
  const a = lum(fg), b = lum(bg); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
// The word-cut pass rule for the live rows and the self-test (finding F143): the pause must
// land at most 20 ms before the cut end (timer and media-clock jitter) and at most 50 ms
// after it. One function serves the live rows and the self-test, so the self-test tests the
// real rule with synthetic values.
function wordCutVerdict(pauseAt, cutEnd) {
  const signedPauseDeltaMs = Math.round((pauseAt - cutEnd) * 1000);
  const overshoot = Math.max(0, signedPauseDeltaMs);
  const early = Math.max(0, -signedPauseDeltaMs);
  return { signedPauseDeltaMs, overshoot, early, overshootOk: overshoot <= 50, earlyOk: early <= 20 };
}
// The bottom-bar gap for the live row and the self-test (finding F143): with a matching bar,
// the rounded gap between the bar bottom and the viewport bottom; without a bar, bars=0 and
// the row passes as before.
async function bottomBarGap(pg, selector) {
  return pg.evaluate((sel) => {
    const bar = document.querySelector(sel);
    if (!bar) return { bars: 0, gap: 0 };
    const rect = bar.getBoundingClientRect();
    return { bars: 1, gap: Math.round(window.innerHeight - rect.bottom) };
  }, selector);
}
// The bottom edge of the measured controls at 844x390, in pixels (findings F150, F280 to F282).
// The live rows and the self-test share it; the layout fix in landscape keeps the controls
// inside the viewport so the child needs no scroll to reach them. The default selector is the
// `flex flex-wrap gap-2` row of the page arrows and the mode buttons; the song play control,
// the question skip control, and the end-of-book tiles pass their own selector.
async function controlBottomAtLandscape(pg, selector = 'div.flex.flex-wrap.gap-2 > button') {
  await pg.setViewportSize({ width: 844, height: 390 });
  // The page pictures are lazy; measure only after every image has loaded, or the layout is
  // still short and the row would pass before the picture takes its height (finding F150).
  await pg
    .waitForFunction(() => [...document.images].every((img) => img.complete), undefined, { timeout: 10000 })
    .catch(() => {});
  await pg.waitForTimeout(50);
  return pg.evaluate((sel) => {
    let bottom = 0;
    let count = 0;
    for (const el of document.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        count += 1;
        bottom = Math.max(bottom, rect.bottom);
      }
    }
    const picture = document.querySelector('img');
    const sections = [...document.querySelectorAll('section')].map((el) => ({
      label: (el.getAttribute('aria-label') ?? el.getAttribute('data-page-number') ?? el.tagName).slice(0, 18),
      box: Math.round(el.getBoundingClientRect().height),
    }));
    return {
      bottom: Math.round(bottom),
      count,
      viewport: Math.round(window.innerHeight),
      picture: picture ? Math.round(picture.getBoundingClientRect().height) : 0,
      sections,
    };
  }, selector);
}
// The right edge of the measured controls at 844x390, in pixels (finding F320). The live
// rows and the self-test share it, as `controlBottomAtLandscape` does for the bottom edge: a
// landscape tile row that pushes a tile past the right edge forces a sideways scroll, so the
// row must report the widest right edge and the check compares it with the viewport width.
async function controlRightAtLandscape(pg, selector) {
  await pg.setViewportSize({ width: 844, height: 390 });
  // The tile pictures are lazy; measure only after every image has loaded, or a tile without
  // its picture is narrower than its settled width (the same rule as controlBottomAtLandscape).
  await pg
    .waitForFunction(() => [...document.images].every((img) => img.complete), undefined, { timeout: 10000 })
    .catch(() => {});
  await pg.waitForTimeout(50);
  return pg.evaluate((sel) => {
    let right = 0;
    let count = 0;
    for (const el of document.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        count += 1;
        right = Math.max(right, rect.right);
      }
    }
    return {
      right: Math.round(right),
      count,
      viewport: Math.round(window.innerWidth),
    };
  }, selector);
}
// Every interactive element of a screen at 844x390 (finding F360): the bottom and the right
// edge of each `a`, `button`, `[role=button]`, and `[data-word]` must stay inside the
// viewport, so no child-facing control sits below the fold or past the right edge in
// landscape. The live rows and the self-test share it; `outside` counts the elements that
// fail either edge and `outsideList` names them, so a fail shows which element must move.
// `extraSelector` (finding F370) measures a second element kind, such as the child-facing
// `<audio controls>` speakers of the week tiles, with its own count, bottom, and outside
// number, so the row fails when such a speaker leaves the viewport.
async function allControlsAtLandscape(pg, selector = 'a[href], button, [role="button"], [data-word]', extraSelector = null) {
  await pg.setViewportSize({ width: 844, height: 390 });
  // The pictures are lazy; measure only after every image has loaded, or the layout is still
  // short and an element would pass before the picture takes its height.
  await pg
    .waitForFunction(() => [...document.images].every((img) => img.complete), undefined, { timeout: 10000 })
    .catch(() => {});
  await pg.waitForTimeout(50);
  return pg.evaluate(({ sel, extra }) => {
    const viewportH = Math.round(window.innerHeight);
    const viewportW = Math.round(window.innerWidth);
    let count = 0;
    let outside = 0;
    let maxBottom = 0;
    let maxRight = 0;
    const outsideList = [];
    for (const el of document.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      count += 1;
      maxBottom = Math.max(maxBottom, Math.round(rect.bottom));
      maxRight = Math.max(maxRight, Math.round(rect.right));
      if (Math.round(rect.bottom) > viewportH || Math.round(rect.right) > viewportW) {
        outside += 1;
        outsideList.push(`${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 16)}] bottom=${Math.round(rect.bottom)} right=${Math.round(rect.right)}`);
      }
    }
    let speakerCount = 0;
    let speakerOutside = 0;
    let speakerBottom = 0;
    if (extra) {
      for (const el of document.querySelectorAll(extra)) {
        const rect = el.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) continue;
        speakerCount += 1;
        speakerBottom = Math.max(speakerBottom, Math.round(rect.bottom));
        if (Math.round(rect.bottom) > viewportH || Math.round(rect.right) > viewportW) speakerOutside += 1;
      }
    }
    return { viewportH, viewportW, count, outside, maxBottom, maxRight, outsideList, speakerCount, speakerOutside, speakerBottom };
  }, { sel: selector, extra: extraSelector });
}
async function watchNetwork(page) {
  const requests = [];
  const transfers = [];
  const byId = new Map();
  let tapped = false;
  const cdp = await page.context().newCDPSession(page);
  const mediaPath = url => /\.(mp3|m4a|aac|ogg|wav|flac|mp4|m4v|mov|webm|ogv)(?:\?|$)/i.test(new URL(url).pathname);
  cdp.on('Network.requestWillBeSent', event => {
    const item = { url: event.request.url, type: event.type, media: event.type === 'Media' || mediaPath(event.request.url), afterTap: tapped };
    requests.push(item);
    byId.set(event.requestId, item);
  });
  cdp.on('Network.loadingFinished', event => {
    const item = byId.get(event.requestId);
    if (item) transfers.push({ ...item, bytes: event.encodedDataLength });
  });
  await cdp.send('Network.enable');
  return {
    requests,
    transfers,
    tap() { tapped = true; },
    async close() { await cdp.detach(); },
  };
}
try {
  const selfTestPages = new Map([
    ['/button', '<!doctype html><button style="width:30px;height:30px">x</button>'],
    ['/large-script', `<!doctype html><script>window.payload='${'x'.repeat(400000)}'</script>`],
    ['/contrast', '<!doctype html><p style="color:white;background:#3080ff">x</p>'],
    // The week 404 lang self-test: a /th/ URL whose 404 page hydrates with lang="en", with both
    // texts present, so only the lang half of checkWeek404 can fail (PM 2026-11-05).
    ['/th/nowhere', '<!doctype html><html lang="en"><body>ไม่พบหน้านี้ This page is not here</body></html>'],
    // F143 self-test pages: one deliberately bad page per row that a synthetic page can
    // exercise (duplicate ids; a bottom bar 10 px above the viewport bottom; a focusable
    // button with no visible focus indicator).
    ['/duplicate-id', '<!doctype html><div id="same"></div><p id="same"></p>'],
    ['/bottom-bar', '<!doctype html><style>.fixed.bottom{position:fixed;left:0;right:0;bottom:10px;height:40px;background:#333}</style><div class="fixed bottom"></div>'],
    ['/no-focus-ring', '<!doctype html><style>button,button:focus{outline:none;box-shadow:none}</style><button>press</button>'],
    // F150 self-test page: a tall block pushes its player control below the 390 px landscape
    // viewport, so the shared landscape check must reject it.
    ['/tall-controls', '<!doctype html><div style="height:600px;background:#eee"></div><div class="flex flex-wrap gap-2"><button>go</button></div>'],
    // F154 self-test page: no player control matches the row selector, so the check must
    // reject the page instead of passing with control_bottom_px=0.
    ['/no-controls', '<!doctype html><div class="flex flex-wrap gap-2"></div><p>no controls</p>'],
    // F320 self-test page: a row of two tiles whose minimum widths push the second tile past
    // the 844 px right edge, so the shared right-edge check must reject it.
    ['/wide-row', '<!doctype html><style>.row{display:flex;gap:12px}</style><div class="row"><button style="min-width:500px;height:60px">a</button><button style="min-width:500px;height:60px">b</button></div>'],
    // F360 self-test page: one interactive element sits below the 390 px fold, so the shared
    // all-controls check must reject the page.
    ['/below-fold', '<!doctype html><div style="height:600px;background:#eee"></div><button>late</button>'],
    // F371 self-test page: one link inside the viewport. The old count > 0 rule improperly
    // passed such a page; the reader row minimum of 9 must reject it.
    ['/one-link', '<!doctype html><a href="/only">only link</a>'],
    // F410 self-test page: one audio speaker below the 390 px fold, so the extraSelector
    // speaker branch of the all-controls check must report it and reject the page.
    ['/audio-below-fold', '<!doctype html><div style="height:600px;background:#eee"></div><audio controls style="width:300px;height:54px"></audio>'],
  ]);
  const selfTestStatus = new Map([['/th/nowhere', 404]]);
  const selfTestServer = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const html = selfTestPages.get(pathname) ?? '';
    res.writeHead(selfTestStatus.get(pathname) ?? 200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await runCheck('Start inline self-test server', async () => {
    await new Promise((resolve, reject) => {
      selfTestServer.once('error', reject);
      selfTestServer.listen(0, '127.0.0.1', resolve);
    });
    return { ok: true };
  });
  const selfTestPort = selfTestServer.address()?.port;
  // The three deliberately bad inline pages must fail their respective limits before live checks.
  for (const [name, html, check] of [
    ['30 px button (entry floor)', '/button', async p => (await p.locator('button').boundingBox()).width >= 64],
    ['30 px button (player floor)', '/button', async p => (await p.locator('button').boundingBox()).width >= 44],
    ['400 KB script', '/large-script', async p => p._transferredBytes <= 300000],
    ['white text on #3080ff', '/contrast', async p => ratio(await p.locator('p').evaluate(e=>getComputedStyle(e).color), await p.locator('p').evaluate(e=>getComputedStyle(e).backgroundColor)) >= 4.5],
    ['lang="en" under a /th/ URL (week 404 lang)', '/th/nowhere', async p => (await checkWeek404(p, `http://127.0.0.1:${selfTestPort}/th/nowhere`, 'th')).ok],
    // F143 self-tests: each check uses the same function as its live row, with the row value
    // printed, so a page that must be rejected shows the reason.
    ['two elements with one id (duplicate_ids)', '/duplicate-id', async p => { const counts = await duplicateIdCount(p); console.log(`selftest duplicate_ids=${counts.duplicates} (ids_found=${counts.ids})`); return counts.duplicates === 0; }],
    ['a bottom bar 10 px above the viewport bottom (bottom_bar_gap_px)', '/bottom-bar', async p => { const info = await bottomBarGap(p, '[class*="fixed"][class*="bottom"]'); console.log(`selftest bottom_bar_gap_px=${info.gap} (bars_found=${info.bars})`); return info.bars === 0 || info.gap <= 1; }],
    ['a button with no visible focus indicator (focus_visible_failures)', '/no-focus-ring', async p => { const out = await focusVisibleFailures(p); console.log(`selftest focus_visible_failures=${out.failures.length} (targets=${out.count})`); return out.failures.length === 0; }],
    ['controls below the fold at 844x390 (landscape_controls_visible)', '/tall-controls', async p => { const info = await controlBottomAtLandscape(p); console.log(`selftest landscape_controls_visible=${info.count > 0 && info.bottom > 0 && info.bottom <= info.viewport} (control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport})`); return info.count > 0 && info.bottom > 0 && info.bottom <= info.viewport; }],
    ['no player control found at 844x390 (landscape_controls_visible)', '/no-controls', async p => { const info = await controlBottomAtLandscape(p); console.log(`selftest landscape_controls_visible=${info.count > 0 && info.bottom > 0 && info.bottom <= info.viewport} (control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport})`); return info.count > 0 && info.bottom > 0 && info.bottom <= info.viewport; }],
    ['a tile row wider than the viewport at 844x390 (landscape_row_right_edge)', '/wide-row', async p => { const info = await controlRightAtLandscape(p, '.row > button'); console.log(`selftest landscape_row_right_edge=${info.count > 0 && info.right > 0 && info.right <= info.viewport} (control_right_px=${info.right}, controls_found=${info.count}, viewport_width_px=${info.viewport})`); return info.count > 0 && info.right > 0 && info.right <= info.viewport; }],
    ['an interactive element below the fold at 844x390 (all_controls_visible)', '/below-fold', async p => { const info = await allControlsAtLandscape(p); console.log(`selftest all_controls_visible=${info.count > 0 && info.outside === 0} (controls_found=${info.count}, controls_outside=${info.outside}, max_bottom_px=${info.maxBottom}, viewport_px=${info.viewportH})`); return info.count > 0 && info.outside === 0; }],
    ['one link against the reader minimum of 9 (all_controls_visible)', '/one-link', async p => { const info = await allControlsAtLandscape(p); const oldRule = info.count > 0 && info.outside === 0; const newRule = info.count >= 9 && info.outside === 0; console.log(`selftest all_controls_visible_min old_rule_passes=${oldRule} new_rule_passes=${newRule} (controls_found=${info.count}, controls_min=9, controls_outside=${info.outside})`); return newRule; }],
    ['an audio speaker below the fold at 844x390 (all_controls_visible speaker probe)', '/audio-below-fold', async p => { const info = await allControlsAtLandscape(p, 'button', 'audio'); console.log(`selftest all_controls_speaker_probe=${info.speakerOutside === 0} (speakers_found=${info.speakerCount}, speakers_outside=${info.speakerOutside}, speaker_bottom_px=${info.speakerBottom}, viewport_px=${info.viewportH})`); return info.speakerOutside === 0; }],
    ['a fallback page with no song section against the song row open rule (all_controls_visible)', '/one-link', async p => { const info = await allControlsAtLandscape(p); const songOpen = (await p.locator('section[data-part="song"] button').count()) > 0; const countRule = info.count >= 1 && info.outside === 0; console.log(`selftest all_controls_song_open song_open_ok=${songOpen} count_rule_ok=${countRule} (controls_found=${info.count}, controls_min=1, song_buttons_found=0)`); return songOpen; }],    ['a pause 80 ms after the cut end (word cut overshoot rule)', '/button', async () => { const v = wordCutVerdict(0.34 + 0.080, 0.34); console.log(`selftest word_cut_overshoot_ms=${v.overshoot}`); return v.overshootOk; }],
    ['a pause 48 ms before the cut end (word cut early rule)', '/button', async () => { const v = wordCutVerdict(0.34 - 0.048, 0.34); console.log(`selftest word_cut_early_ms=${v.early}`); return v.earlyOk; }],
    ['a pause at the cut end passes both word cut rules', '/button', async () => { const v = wordCutVerdict(0.34, 0.34); console.log(`selftest word_cut signed=${v.signedPauseDeltaMs} overshoot=${v.overshoot} early=${v.early}`); return !(v.overshootOk && v.earlyOk); }],
  ]) {
    await runCheck(`self-test rejects ${name}`, async () => {
      const p = await browser.newPage();
      let network;
      try {
        network = await watchNetwork(p);
        await p.goto(`http://127.0.0.1:${selfTestPort}${html}`, { waitUntil: 'networkidle' });
        p._transferredBytes = network.transfers.filter(r => !r.afterTap).reduce((sum, r) => sum + r.bytes, 0);
        const improperlyPassed = await check(p);
        return { ok: !improperlyPassed };
      } finally {
        if (network) await network.close();
        await p.close();
      }
    });
  }
  await runCheck('Stop inline self-test server', async () => {
    await new Promise((resolve, reject) => selfTestServer.close(error => error ? reject(error) : resolve()));
    return { ok: true };
  });

  let context, page, network;
  await runCheck('Create live review browser context', async () => {
    context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    page = await context.newPage();
    await interceptMedia(page);
    network = await watchNetwork(page);
    return { ok: true };
  });
  await runCheck('Open ready review page and capture first load', async () => {
    if (!page || !network) throw new Error('Browser context is unavailable');
    await page.goto(`${base}/th/st/2/1`, { waitUntil: 'networkidle' });
    return { ok: true };
  });
  const firstLoadBytes = await runCheck('AC-5.3 first-load transfer is at most 300000 bytes', async () => {
    if (!network) throw new Error('CDP session is unavailable');
    const bytes = network.transfers.filter(r => !r.afterTap).reduce((sum, r) => sum + r.bytes, 0);
    console.log(`transferred_bytes_first_load=${bytes}`);
    return { ok: bytes <= 300000, detail: `transferred_bytes_first_load=${bytes}`, value: bytes };
  });
  const beforeTapMedia = await runCheck('AC-5.3 no audio or video request occurs before tap', async () => {
    if (!network) throw new Error('CDP session is unavailable');
    const count = network.requests.filter(r => !r.afterTap && r.media).length;
    console.log(`media_requests_before_tap=${count}`);
    return { ok: count === 0, detail: `media_requests_before_tap=${count}`, value: count };
  });
  const firstLoadRequests = await runCheck('First-load request count is at least five', async () => {
    if (!network) throw new Error('CDP session is unavailable');
    const count = network.requests.filter(r => !r.afterTap).length;
    console.log(`requests_total=${count}`);
    return { ok: count >= 5, detail: `requests_total=${count}`, value: count };
  });
  await runCheck('First audio or video request occurs after the tap', async () => {
    if (!page || !network) throw new Error('Browser page or CDP session is unavailable');
    const tile = page.locator('a[href*="part=book"]').first();
    await tile.waitFor();
    network.tap();
    await tile.click();
    await page.waitForLoadState('networkidle');
    const mediaRequest = page.waitForRequest(request =>
      request.resourceType() === 'media' || /\.(mp3|m4a|aac|ogg|wav|flac|mp4|m4v|mov|webm|ogv)(?:\?|$)/i.test(new URL(request.url()).pathname),
      { timeout: 10000 },
    );
    await page.locator('button').nth(2).click();
    await mediaRequest;
    const index = network.requests.findIndex(r => r.media);
    console.log(`first_media_request_index=${index}`);
    return { ok: index >= 0 && network.requests[index].afterTap, detail: `first_media_request_index=${index}` };
  });

  for (const viewport of [{ width: 360, height: 800 }, { width: 800, height: 360 }]) {
    const dimensions = await runCheck(`Measure targets at ${viewport.width}x${viewport.height}`, async () => {
      if (!page) throw new Error('Browser page is unavailable');
      await page.setViewportSize(viewport);
      await page.goto(`${base}/th/st/2/1`, { waitUntil: 'networkidle' });
      const targets = await page.locator('a[href*="part="], audio[aria-label]').evaluateAll(nodes => nodes.map(n => {
        const r=n.getBoundingClientRect(); return { tag:n.tagName, width:r.width, height:r.height };
      }));
      const tiles = targets.filter(t => t.tag === 'A');
      const speakers = targets.filter(t => t.tag === 'AUDIO');
      const minTile = tiles.length ? Math.min(...tiles.map(area)) : 0;
      const minSpeaker = speakers.length ? Math.min(...speakers.map(area)) : 0;
      console.log(`tap_target_min_px_tiles_${viewport.width}x${viewport.height}=${Math.floor(minTile)}`);
      console.log(`tap_target_min_px_speakers_${viewport.width}x${viewport.height}=${Math.floor(minSpeaker)}`);
      return { ok: true, value: { tiles: tiles.length, speakers: speakers.length, minTile, minSpeaker } };
    });
    await runCheck(`64 px tiles at ${viewport.width}x${viewport.height}`, async () => {
      if (!dimensions) throw new Error('Tap-target measurements are unavailable');
      return { ok: dimensions.tiles >= 3 && dimensions.minTile >= 64 };
    });
    await runCheck(`64 px speakers at ${viewport.width}x${viewport.height}`, async () => {
      if (!dimensions) throw new Error('Tap-target measurements are unavailable');
      return { ok: dimensions.speakers >= 1 && dimensions.minSpeaker >= 64 };
    });
  }
  await runCheck('AC-8.2 phone video box ratio', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: 'networkidle' });
    const value = await page.locator('.song-stage').evaluate(e => { const r=e.getBoundingClientRect(); return Math.round(r.width/r.height*1000); });
    console.log(`video_box_ratio_x1000_phone=${value}`);
    return { ok: Math.abs(value-562)<=5, detail: `video_box_ratio_x1000_phone=${value}` };
  });
  await runCheck('AC-8.2 phone video height', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: 'networkidle' });
    const value = await page.locator('.song-stage').evaluate(e => Math.round(e.getBoundingClientRect().height/innerHeight*100));
    console.log(`video_box_height_pct_phone=${value}`);
    return { ok: value<=75, detail: `video_box_height_pct_phone=${value}` };
  });
  await runCheck('AC-8.2 laptop video box ratio', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: 'networkidle' });
    const value = await page.locator('.song-stage').evaluate(e => { const r=e.getBoundingClientRect(); return Math.round(r.width/r.height*1000); });
    console.log(`video_box_ratio_x1000_laptop=${value}`);
    return { ok: Math.abs(value-1778)<=5, detail: `video_box_ratio_x1000_laptop=${value}` };
  });
  // The song cap holds only in landscape below 500 px of height (finding F330): at a short
  // portrait viewport the video keeps its full 9:16 box, so the orientation clause is load
  // bearing. A deleted clause re-caps the box at 176 px here and this row fails.
  await runCheck('song video is not capped at a short portrait viewport (390x400)', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.setViewportSize({ width: 390, height: 400 });
    await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: 'networkidle' });
    const box = await page.locator('section[data-part="song"] video').evaluate(e => {
      const r = e.getBoundingClientRect();
      return { height: Math.round(r.height), width: Math.round(r.width), ratio: Math.round(r.width / r.height * 1000) };
    });
    console.log(`song_video_fullsize_short_portrait=${box.height > 177} (video_height_px=${box.height}, video_width_px=${box.width}, video_ratio_x1000=${box.ratio}, cap_px=176)`);
    return { ok: box.height > 177, detail: `video_height_px=${box.height}, cap_px=176` };
  });
  // The P3.6 rows (findings F125, F121 live, F120 live, F123 live). Each row prints a labeled
  // value. Every rule that a synthetic page or value can exercise has a self-test in the
  // self-test list above (finding F143); the live rows add the real audio, the fixture, and
  // the hydrated screens that no synthetic page can replace.
  const questionScreen = async () => {
    await page.goto(`${base}/th/st/2/1?part=book`, { waitUntil: 'networkidle' });
    for (let i = 0; i < 10; i += 1) {
      if (await page.locator('[data-question-screen]').count()) return true;
      const next = page.locator('button[aria-label="หน้าถัดไป"]');
      if (!(await next.count()) || !(await next.isEnabled())) break;
      await next.click();
      await page.waitForTimeout(150);
    }
    return Boolean(await page.locator('[data-question-screen]').count());
  };

  // duplicate_ids on every rendered at-home screen.
  for (const screen of ['home', 'book', 'decodable', 'song']) {
    await runCheck(`duplicate_ids is 0 on the ${screen} screen`, async () => {
      if (!page) throw new Error('Browser page is unavailable');
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(screen === 'home' ? `${base}/th/st/2/1` : `${base}/th/st/2/1?part=${screen}`, { waitUntil: 'networkidle' });
      const counts = await duplicateIdCount(page);
      console.log(`duplicate_ids_${screen}=${counts.duplicates} (ids_found=${counts.ids})`);
      return { ok: counts.duplicates === 0, detail: `duplicate_ids_${screen}=${counts.duplicates}` };
    });
  }
  await runCheck('duplicate_ids is 0 on the question screen', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    if (!(await questionScreen())) throw new Error('the question screen did not render');
    const counts = await duplicateIdCount(page);
    console.log(`duplicate_ids_question=${counts.duplicates} (ids_found=${counts.ids})`);
    return { ok: counts.duplicates === 0, detail: `duplicate_ids_question=${counts.duplicates}` };
  });

  // tap_target_min_px_player: 44 px floor over the reader, the decodable, and the question
  // screen, in portrait and landscape. The question tiles keep the 64 px floor of AC-5.2.
  const playerScreens = ['book', 'decodable'];
  for (const viewport of [{ width: 360, height: 800 }, { width: 800, height: 360 }]) {
    for (const screen of playerScreens) {
      await runCheck(`tap_target_min_px_player is at least 44 on ${screen} at ${viewport.width}x${viewport.height}`, async () => {
        if (!page) throw new Error('Browser page is unavailable');
        await page.setViewportSize(viewport);
        await page.goto(`${base}/th/st/2/1?part=${screen}`, { waitUntil: 'networkidle' });
        const measured = await minTapSide(page);
        console.log(`tap_target_min_px_player_${screen}_${viewport.width}x${viewport.height}=${measured.min} (elements=${measured.count}, smallest=${measured.smallest})`);
        return { ok: measured.count > 0 && measured.min >= 44, detail: `min=${measured.min}, elements=${measured.count}` };
      });
    }
    await runCheck(`tap_target_min_px_player is at least 44 on the question screen at ${viewport.width}x${viewport.height}`, async () => {
      if (!page) throw new Error('Browser page is unavailable');
      await page.setViewportSize(viewport);
      if (!(await questionScreen())) throw new Error('the question screen did not render');
      const measured = await minTapSide(page);
      const tileSides = await page.locator('[data-question-screen] button[data-choice-page]').evaluateAll(nodes =>
        nodes.map(n => Math.min(n.getBoundingClientRect().width, n.getBoundingClientRect().height)));
      const tileMin = tileSides.length ? Math.floor(Math.min(...tileSides)) : 0;
      console.log(`tap_target_min_px_player_question_${viewport.width}x${viewport.height}=${measured.min} (elements=${measured.count}, tile_min=${tileMin})`);
      return { ok: measured.count > 0 && measured.min >= 44 && tileMin >= 64, detail: `min=${measured.min}, tile_min=${tileMin}` };
    });
  }

  // bottom_bar_gap_px at 768x1024 (finding F143): with a matching bar, the gap between the
  // bar bottom and the viewport bottom fails above 1; without a bar, the row passes and
  // prints bars_found=0.
  await runCheck('bottom_bar_gap_px is at most 1 at 768x1024', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${base}/th/st/2/1?part=book`, { waitUntil: 'networkidle' });
    const selector = '[data-bottom-bar], [class*="fixed"][class*="bottom"], [class*="sticky"][class*="bottom"]';
    const barInfo = await bottomBarGap(page, selector);
    if (barInfo.bars === 0) {
      console.log(`bottom_bar_gap_px=0 (selector=${selector}; bars_found=0)`);
      return { ok: true, detail: 'bars_found=0' };
    }
    console.log(`bottom_bar_gap_px=${barInfo.gap} (selector=${selector}; bars_found=${barInfo.bars})`);
    return { ok: barInfo.gap <= 1, detail: `bottom_bar_gap_px=${barInfo.gap}` };
  });

  // landscape_controls_visible at 844x390 (finding F150): the page picture is capped in
  // landscape, so the lowest control ends inside the viewport and the child needs no scroll.
  for (const screen of ['book', 'decodable']) {
    await runCheck(`landscape_controls_visible on the ${screen} screen at 844x390`, async () => {
      if (!page) throw new Error('Browser page is unavailable');
      await page.goto(`${base}/th/st/2/1?part=${screen}`, { waitUntil: 'networkidle' });
      const info = await controlBottomAtLandscape(page);
      const ok = info.count > 0 && info.bottom > 0 && info.bottom <= info.viewport;
      console.log(`landscape_controls_visible_${screen}=${ok} (control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}, picture_px=${info.picture}, sections=${JSON.stringify(info.sections)})`);
      return { ok, detail: `control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}` };
    });
  }

  // landscape_controls_visible on the song, the question screen, and the end of the book
  // (findings F280 to F282, the F150 class): the play control, the skip control, and the three
  // end tiles must end inside the 390 px viewport, so the child needs no scroll to reach them.
  await runCheck('landscape_controls_visible on the song screen at 844x390', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: 'networkidle' });
    const info = await controlBottomAtLandscape(page, 'section[data-part="song"] button');
    const ok = info.count > 0 && info.bottom > 0 && info.bottom <= info.viewport;
    console.log(`landscape_controls_visible_song=${ok} (control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}, sections=${JSON.stringify(info.sections)})`);
    return { ok, detail: `control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}` };
  });
  await runCheck('landscape_controls_visible on the question screen at 844x390', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    if (!(await questionScreen())) throw new Error('the question screen did not render');
    const info = await controlBottomAtLandscape(page, '[data-question-screen] button:not([data-choice-page])');
    const ok = info.count > 0 && info.bottom > 0 && info.bottom <= info.viewport;
    console.log(`landscape_controls_visible_question=${ok} (control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}, sections=${JSON.stringify(info.sections)})`);
    return { ok, detail: `control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}` };
  });
  await runCheck('landscape_controls_visible on the end of the book at 844x390', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.goto(`${base}/th/st/2/4?part=book`, { waitUntil: 'networkidle' });
    let reached = false;
    for (let i = 0; i < 12; i += 1) {
      if (await page.locator('[data-reader-end]').count()) { reached = true; break; }
      const next = page.locator('button[aria-label="หน้าถัดไป"]');
      if (!(await next.count()) || !(await next.isEnabled())) break;
      await next.click();
      await page.waitForTimeout(120);
    }
    if (!reached) reached = Boolean(await page.locator('[data-reader-end]').count());
    if (!reached) throw new Error('the end of the book did not render');
    const info = await controlBottomAtLandscape(page, '[data-reader-end] a');
    const ok = info.count >= 3 && info.bottom > 0 && info.bottom <= info.viewport;
    console.log(`landscape_controls_visible_endofbook=${ok} (control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}, sections=${JSON.stringify(info.sections)})`);
    return { ok, detail: `control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}` };
  });

  // landscape_controls_visible on the week page tiles at 844x390 (finding F310, the F150
  // class): the entry tiles kept a column on the old layout, so the song tile ended below the
  // 390 px viewport and the child needed a scroll to reach it. The list uses the same
  // landscape row as the end of the book (F282), so all tiles stay inside the viewport.
  await runCheck('landscape_controls_visible on the week page at 844x390', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.goto(`${base}/th/st/2/1`, { waitUntil: 'networkidle' });
    const info = await controlBottomAtLandscape(page, '[data-week-tiles] a');
    const ok = info.count >= 3 && info.bottom > 0 && info.bottom <= info.viewport;
    console.log(`landscape_controls_visible_week=${ok} (control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}, sections=${JSON.stringify(info.sections)})`);
    return { ok, detail: `control_bottom_px=${info.bottom}, controls_found=${info.count}, viewport_px=${info.viewport}` };
  });

  // The landscape tile rows hold a horizontal-fit rule (finding F320): every tile of the
  // end-of-book row and of the week page row must end at or inside the right viewport edge at
  // 844x390, in both locales, or a child must scroll sideways to reach a link. The
  // bottom-edge rows cannot catch a sideways overflow, and the Thai labels of the fixture fit,
  // so the English route is measured too.
  const reachEndOfBook = async (locale) => {
    await page.goto(`${base}/${locale}/st/2/4?part=book`, { waitUntil: 'networkidle' });
    const nextLabel = locale === 'th' ? 'หน้าถัดไป' : 'Next page';
    let reached = false;
    for (let i = 0; i < 12; i += 1) {
      if (await page.locator('[data-reader-end]').count()) { reached = true; break; }
      const next = page.locator(`button[aria-label="${nextLabel}"]`);
      if (!(await next.count()) || !(await next.isEnabled())) break;
      await next.click();
      await page.waitForTimeout(120);
    }
    if (!reached) reached = Boolean(await page.locator('[data-reader-end]').count());
    if (!reached) throw new Error('the end of the book did not render');
  };
  for (const locale of ['th', 'en']) {
    await runCheck(`landscape_row_right_edge on the end of the book at 844x390 (${locale})`, async () => {
      if (!page) throw new Error('Browser page is unavailable');
      await reachEndOfBook(locale);
      const info = await controlRightAtLandscape(page, '[data-reader-end] a');
      const ok = info.count >= 3 && info.right > 0 && info.right <= info.viewport;
      console.log(`landscape_row_right_edge_endofbook_${locale}=${ok} (control_right_px=${info.right}, controls_found=${info.count}, viewport_width_px=${info.viewport})`);
      return { ok, detail: `control_right_px=${info.right}, controls_found=${info.count}, viewport_width_px=${info.viewport}` };
    });
    await runCheck(`landscape_row_right_edge on the week page at 844x390 (${locale})`, async () => {
      if (!page) throw new Error('Browser page is unavailable');
      await page.goto(`${base}/${locale}/st/2/1`, { waitUntil: 'networkidle' });
      const info = await controlRightAtLandscape(page, '[data-week-tiles] a');
      const ok = info.count >= 3 && info.right > 0 && info.right <= info.viewport;
      console.log(`landscape_row_right_edge_week_${locale}=${ok} (control_right_px=${info.right}, controls_found=${info.count}, viewport_width_px=${info.viewport})`);
      return { ok, detail: `control_right_px=${info.right}, controls_found=${info.count}, viewport_width_px=${info.viewport}` };
    });
  }

  // One all-controls row per at-home screen at 844x390 (finding F360, the F150 class): every
  // interactive element (`a`, `button`, `[role=button]`, `[data-word]`) ends inside the
  // viewport on the bottom and the right edge, so no child-facing control sits below the fold
  // in landscape. Each row holds a per-screen minimum count (finding F371) from the measured
  // values, so a screen that falls back to a single home link fails its row instead of
  // passing on count > 0. The rows print `controls_found`, the minimum, the number of
  // elements outside, and the first offenders, so a fail shows which element must move. The
  // week row (finding F370) also measures the child-facing tile speakers, which the
  // link-and-button selector misses.
  const allControlsCheck = async (name, open, minCount, extraSelector = null) => {
    await runCheck(`all_controls_visible on the ${name} screen at 844x390`, async () => {
      if (!page) throw new Error('Browser page is unavailable');
      await open();
      const info = await allControlsAtLandscape(page, undefined, extraSelector);
      const ok = info.count >= minCount && info.outside === 0 && info.speakerOutside === 0;
      console.log(`all_controls_visible_${name}=${ok} (controls_found=${info.count}, controls_min=${minCount}, controls_outside=${info.outside}, speakers_found=${info.speakerCount}, speakers_outside=${info.speakerOutside}, speaker_bottom_px=${info.speakerBottom}, outside=${JSON.stringify(info.outsideList.slice(0, 4))}, max_bottom_px=${info.maxBottom}, max_right_px=${info.maxRight}, viewport_px=${info.viewportH}x${info.viewportW})`);
      return { ok, detail: `controls_found=${info.count}, controls_min=${minCount}, controls_outside=${info.outside}, speakers_outside=${info.speakerOutside}, max_bottom_px=${info.maxBottom}` };
    });
  };
  await allControlsCheck('week', async () => {
    await page.goto(`${base}/th/st/2/1`, { waitUntil: 'networkidle' });
  }, 3, '[data-week-tiles] audio');
  await allControlsCheck('reader', async () => {
    await page.goto(`${base}/th/st/2/1?part=book`, { waitUntil: 'networkidle' });
  }, 9);
  await allControlsCheck('endofbook', async () => {
    await reachEndOfBook('th');
  }, 3);
  await allControlsCheck('decodable', async () => {
    await page.goto(`${base}/th/st/2/1?part=decodable`, { waitUntil: 'networkidle' });
  }, 8);
  await allControlsCheck('song', async () => {
    await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: 'networkidle' });
    // F411: the minimum of 1 equals the fallback WeekHomeLink, so the open step requires
    // the song section itself; a week with no song renders one link and must fail here.
    if (!(await page.locator('section[data-part="song"] button').count())) throw new Error('the song section did not render');
  }, 1);
  await allControlsCheck('question', async () => {
    if (!(await questionScreen())) throw new Error('the question screen did not render');
  }, 4);

  // reduced_motion_transition_ms: 0 on the marks with reducedMotion reduce.
  await runCheck('reduced_motion_transition_ms is 0 on the marks', async () => {
    const rmContext = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
    const rmPage = await rmContext.newPage();
    try {
      await interceptMedia(rmPage);
      await rmPage.goto(`${base}/th/st/2/1?part=book`, { waitUntil: 'networkidle' });
      const milliseconds = await rmPage.evaluate(() => {
        const marks = [...document.querySelectorAll('[data-word], [data-sentence]')];
        if (!marks.length) throw new Error('no marks rendered');
        // `motion-reduce:transition-none` compiles to `transition-property: none`, and Chromium
        // still reports the old duration string next to it; a mark with property none holds 0 ms.
        const duration = (el) => {
          const cs = getComputedStyle(el);
          if (cs.transitionProperty === 'none') return 0;
          return Math.max(...cs.transitionDuration.split(',').map(d => parseFloat(d) * 1000));
        };
        return Math.max(...marks.map(duration));
      });
      console.log(`reduced_motion_transition_ms=${milliseconds}`);
      return { ok: milliseconds === 0, detail: `reduced_motion_transition_ms=${milliseconds}` };
    } finally {
      await rmContext.close();
    }
  });

  // contrast_min_ratio_x100: one value per HIGHLIGHT_CLASSES state from computed colors. The
  // sampling page runs with reducedMotion reduce, so the computed color of a mark is its
  // settled color and no transition sample can lie. The canvas turns every computed color
  // format (oklch, lab, oklab included) into sRGB, and a sampled alpha composites over the
  // nearest opaque ancestor background, white when none exists.
  await runCheck('contrast_min_ratio_x100 is at least 450 for every highlight state', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    const contrastContext = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
    const contrastPage = await contrastContext.newPage();
    try {
      await interceptMedia(contrastPage);
      await contrastPage.goto(`${base}/th/st/2/1?part=book`, { waitUntil: 'networkidle' });
      await contrastPage.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1; canvas.height = 1;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        // Draws the computed color on a 1x1 canvas and reads the pixels back; Chromium parses
        // every CSS color format the page uses, so the row needs no format parser of its own.
        window.__srgb = (value) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = value;
          context.fillRect(0, 0, 1, 1);
          const data = context.getImageData(0, 0, 1, 1).data;
          return { r: data[0] / 255, g: data[1] / 255, b: data[2] / 255, a: data[3] / 255 };
        };
        const luminance = ({ r, g, b }) => {
          const lin = [r, g, b].map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
          return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
        };
        // Composites the layers of one element from itself outward until an opaque layer, and
        // uses white when every ancestor is transparent.
        window.__backgroundOf = (el) => {
          const layers = [];
          let node = el;
          let color = window.__srgb(getComputedStyle(node).backgroundColor);
          while (color.a < 1) {
            layers.push(color);
            node = node.parentElement;
            color = node && node instanceof Element
              ? window.__srgb(getComputedStyle(node).backgroundColor)
              : { r: 1, g: 1, b: 1, a: 1 };
          }
          let backdrop = color;
          for (const layer of layers.reverse()) {
            backdrop = {
              r: layer.r * layer.a + backdrop.r * (1 - layer.a),
              g: layer.g * layer.a + backdrop.g * (1 - layer.a),
              b: layer.b * layer.a + backdrop.b * (1 - layer.a),
              a: 1,
            };
          }
          return backdrop;
        };
        window.__ratioOf = (el) => {
          const foreground = window.__srgb(getComputedStyle(el).color);
          const background = window.__backgroundOf(el);
          const over = (front, back) => ({
            r: front.r * front.a + back.r * (1 - front.a),
            g: front.g * front.a + back.g * (1 - front.a),
            b: front.b * front.a + back.b * (1 - front.a),
          });
          const a = luminance(foreground.a < 1 ? over(foreground, background) : foreground);
          const b = luminance(background);
          return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100);
        };
        window.__sampler = () => {
          const word = document.querySelector('[data-word][aria-current="true"]');
          const sentence = document.querySelector('[data-sentence][aria-current="true"]');
          return {
            word: word ? window.__ratioOf(word) : null,
            sentence: sentence ? window.__ratioOf(sentence) : null,
            raw: word ? `color=${getComputedStyle(word).color} bg=${getComputedStyle(word).backgroundColor}` : null,
            sentenceRaw: sentence ? `color=${getComputedStyle(sentence).color} bg=${getComputedStyle(sentence).backgroundColor}` : null,
          };
        };
      });
      await contrastPage.getByRole('button', { name: 'อ่านให้ฟัง' }).click();
      const wordSamples = []; const sentenceSamples = [];
      for (let i = 0; i < 50; i += 1) {
        const sample = await contrastPage.evaluate(() => window.__sampler());
        if (sample.word !== null) wordSamples.push({ ratio: sample.word, raw: sample.raw });
        if (sample.sentence !== null) sentenceSamples.push({ ratio: sample.sentence, raw: sample.sentenceRaw });
        await contrastPage.waitForTimeout(100);
      }
      if (!wordSamples.length || !sentenceSamples.length) {
        throw new Error('no measurable highlight state after playback');
      }
      // Every sample of a settled mark holds the same value with reduced motion; the minimum
      // of the samples is the state value the floor protects.
      const wordMin = wordSamples.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
      const sentenceMin = sentenceSamples.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
      const states = { currentWord: wordMin.ratio, sentenceBand: sentenceMin.ratio };
      console.log(`contrast_raw_word_min=${wordMin.raw}`);
      console.log(`contrast_raw_sentence_min=${sentenceMin.raw}`);
      await contrastPage.locator('[data-word]').nth(2).hover();
      await contrastPage.waitForTimeout(200);
      states.hover = await contrastPage.evaluate(() => {
        const el = document.querySelectorAll('[data-word]')[2];
        const own = window.__srgb(getComputedStyle(el).backgroundColor);
        if (own.a < 1) return null;
        return window.__ratioOf(el);
      });
      if (states.hover === null) {
        throw new Error('the hover state holds no opaque background after the pointer rests');
      }
      const values = [states.currentWord, states.sentenceBand, states.hover];
      if (values.some(v => v === null || !Number.isFinite(v))) {
        throw new Error(`a highlight state is missing or unmeasurable: ${JSON.stringify(states)}`);
      }
      const minimum = Math.min(...values);
      console.log(`contrast_min_ratio_x100_currentword=${states.currentWord}`);
      console.log(`contrast_min_ratio_x100_sentenceband=${states.sentenceBand}`);
      console.log(`contrast_min_ratio_x100_hover=${states.hover}`);
      console.log(`contrast_min_ratio_x100=${minimum}`);
      return { ok: minimum >= 450, detail: `min=${minimum}` };
    } finally {
      await contrastContext.close();
    }
  });

  // focus_visible_failures over the tab targets of the home, the reader, the decodable, and
  // the question screen (F125).
  {
    let totalTargets = 0; const focusFailures = [];
    for (const screen of ['home', 'book', 'decodable', 'question']) {
      await runCheck(`focus_visible_failures is 0 on the ${screen} screen`, async () => {
        if (!page) throw new Error('Browser page is unavailable');
        await page.setViewportSize({ width: 360, height: 800 });
        if (screen === 'question') {
          if (!(await questionScreen())) throw new Error('the question screen did not render');
        } else {
          await page.goto(screen === 'home' ? `${base}/th/st/2/1` : `${base}/th/st/2/1?part=${screen}`, { waitUntil: 'networkidle' });
        }
        const outcome = await focusVisibleFailures(page);
        console.log(`focus_target_count_${screen}=${outcome.count}`);
        if (outcome.failures.length) focusFailures.push(`${screen}: ${outcome.failures.join(', ')}`);
        totalTargets += outcome.count;
        return { ok: outcome.count > 0 && outcome.failures.length === 0, detail: `targets=${outcome.count}, failures=${outcome.failures.length}` };
      });
    }
    console.log(`focus_target_count=${totalTargets}`);
    if (focusFailures.length) console.log(`focus_visible_failures=${focusFailures.length} (${focusFailures.join(' | ')})`);
    else console.log('focus_visible_failures=0');
  }

  // blend_clips_played: tap one blend word of the w03 decodable with real audio and count the
  // grapheme clips that reach ended before the whole word starts.
  await runCheck('blend_clips_played equals the grapheme count of the tapped blend word', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.setViewportSize({ width: 360, height: 800 });
    const probe = await page.goto(`${base}/th/st/2/3?part=decodable`, { waitUntil: 'networkidle' });
    console.log(`blend_probe: status=${probe?.status()}, title=${JSON.stringify(await page.title())}, buttons=${await page.locator('button').count()}`);
    await page.evaluate(() => {
      window.__endedCount = 0; window.__wholePlayed = false; window.__mediaErrors = [];
      const audios = [...document.querySelectorAll('audio')];
      audios[0]?.addEventListener('ended', () => { window.__endedCount += 1; });
      audios[1]?.addEventListener('play', () => { window.__wholePlayed = true; });
      audios.forEach(a => a.addEventListener('error', () => window.__mediaErrors.push(`${a.currentSrc || 'unknown source'} (${a.error?.code ?? '?'})`)));
    });
    const blendButton = page.getByRole('button', { name: /^pan$/i }).first();
    if (!(await blendButton.count())) {
      const names = await page.locator('button').allTextContents();
      throw new Error(`no blend word button found; button texts: ${JSON.stringify(names.slice(0, 12))}`);
    }
    await blendButton.click();
    // Polls the audio elements while the sequence runs; the poll result names the exact
    // element state when neither a clip nor the whole word ever plays.
    let state = null;
    for (let i = 0; i < 24; i += 1) {
      await page.waitForTimeout(500);
      state = await page.evaluate(() => ({
        ended: window.__endedCount,
        whole: window.__wholePlayed,
        errors: window.__mediaErrors,
        audios: [...document.querySelectorAll('audio')].map(a => ({
          src: (a.currentSrc || a.src || 'none').split('/').pop(),
          paused: a.paused, time: Math.round(a.currentTime * 100) / 100,
          readyState: a.readyState, networkState: a.networkState, code: a.error?.code ?? null,
        })),
        failedAlert: Boolean(document.querySelector('[role="alert"]')),
      }));
      if (state.whole || state.errors.length) break;
    }
    if (state.errors.length && !state.whole) throw new Error(`fixture audio could not play: ${state.errors.join('; ')}`);
    if (!state.whole) {
      throw new Error(`no clip and no whole word started in 12 s; audio state: ${JSON.stringify(state.audios)}, failedAlert=${state.failedAlert}`);
    }
    console.log(`blend_clips_played=${state.ended} (expected=3)`);
    return { ok: state.whole && state.ended === 3, detail: `ended=${state.ended}, whole=${state.whole}` };
  });

  let wordCutSignedPauseDeltaMs = null; // signed pause_at - cut_end, in ms; set by the overshoot row
  // word_cut_overshoot_ms: the time between the cut end and the pause of one reader word cut.
  await runCheck('word_cut_overshoot_ms is at most 50', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    const { default: fs } = await import('node:fs');
    const week = JSON.parse(fs.readFileSync(process.env.PROJECT_FIXTURE_WEEK, 'utf8'));
    const book = week.books.find(b => b.kind === 'readalong');
    const timing = book.audio.sentences.flatMap(s => s.words).find(w => w.end - w.start >= 0.15);
    if (!timing) throw new Error('the fixture week holds no measurable word cut');
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${base}/th/st/2/1?part=book`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__pauseAt = null; window.__cutErrors = [];
      const audio = document.querySelector('audio');
      audio?.addEventListener('pause', () => { window.__pauseAt = audio.currentTime; });
      audio?.addEventListener('error', () => window.__cutErrors.push(`${audio.currentSrc || 'unknown source'} (${audio.error?.code ?? '?'})`));
    });
    await page.getByRole('button', { name: 'ตาฉัน' }).click();
    await page.locator('[data-word]', { hasText: timing.word }).first().click();
    await page.waitForFunction(() => window.__pauseAt !== null || (window.__cutErrors || []).length > 0, null, { timeout: 30000 });
    const state = await page.evaluate(() => ({ pauseAt: window.__pauseAt, errors: window.__cutErrors }));
    if (state.pauseAt === null) throw new Error(`fixture audio could not play: ${state.errors.join('; ')}`);
    const verdict = wordCutVerdict(state.pauseAt, timing.end);
    console.log(`word_cut_overshoot_ms=${verdict.overshoot} (word=${timing.word}, cut_end=${timing.end}, pause_at=${state.pauseAt}, signed_pause_delta_ms=${verdict.signedPauseDeltaMs})`);
    wordCutSignedPauseDeltaMs = verdict.signedPauseDeltaMs;
    return { ok: verdict.overshootOk, detail: `word_cut_overshoot_ms=${verdict.overshoot}` };
  });

  // word_cut_early_ms: the pause lands before the measured cut end when the stop timer counts
  // pre-playback wall time (finding F140, review A4-1); FR-6 asks for play to the measured end.
  await runCheck('word_cut_early_ms is at most 20', async () => {
    if (wordCutSignedPauseDeltaMs === null) throw new Error('the word cut measurement did not run');
    const early = Math.max(0, -wordCutSignedPauseDeltaMs);
    console.log(`word_cut_early_ms=${early} (signed_pause_delta_ms=${wordCutSignedPauseDeltaMs})`);
    // The shared rule applied to the same measurement: pauseAt = cutEnd + signed delta.
    return { ok: wordCutVerdict(wordCutSignedPauseDeltaMs / 1000, 0).earlyOk, detail: `word_cut_early_ms=${early}` };
  });

  await runCheck('Week 404 answers 404 and the hydrated locale lang with both texts', async () => {
    const p = await browser.newPage();
    try {
      return await checkWeek404(p, `${base}/th/st/2/2`, 'th');
    } finally {
      await p.close();
    }
  });

  if (network) await runCheck('Close CDP session', async () => { await network.close(); return { ok: true }; });
  if (context) await runCheck('Close browser context', async () => { await context.close(); return { ok: true }; });
} catch (error) {
  record('Browser gate completed without runtime errors', false, String(error));
} finally {
  await browser.close();
}
console.log(results.join('\n'));
console.log(`PASS=${pass}, FAIL=${fail}`);
if (fail) process.exitCode = 1;
NODE

echo "=== Run Playwright with SYSTEM Chrome (channel: chrome); timeout 15m ==="
if [ "$READY" -eq 1 ]; then
  PROJECT_DEV_URL="http://127.0.0.1:$PORT" PROJECT_FIXTURE_WEEK="$FIXTURE/l2/w01.json" timeout 15m node "$PLAYWRIGHT"
  PW_RC=$?
  if [ "$PW_RC" -eq 0 ]; then pass "Playwright gate exits 0"; else fail "Playwright gate exits $PW_RC"; fi
else
  fail "Playwright step not run because the server is unavailable"
fi

printf '%s\n' "${RESULTS[@]}"
echo "PASS=$PASS_COUNT, FAIL=$FAIL_COUNT"
exit "$FAILED"
