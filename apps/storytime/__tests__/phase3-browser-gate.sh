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
TMP_DIR="$(mktemp -d -t storytime-browser-XXXXXX)"
SERVER_LOG="$TMP_DIR/next-start.log"
FIXTURE="$TMP_DIR/content"
PLAYWRIGHT="$APP/.next/phase3-browser-gate-$$.mjs"

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
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
for (const name of ['w01.json', 'w03.json']) {
  const week = JSON.parse(fs.readFileSync(path.resolve(source, name), 'utf8'));
  // Every approval part holds status approved. An approved loops part needs the date and the
  // exact words of the approval (the week contract), so the fixture fills both.
  for (const part of Object.keys(week.approval)) {
    week.approval[part] = { ...week.approval[part], status: 'approved' };
  }
  if (week.approval.loops) {
    week.approval.loops = { ...week.approval.loops, date: '2026-11-05', words: 'fixture approval for the browser gate' };
  }
  // The blend row needs a published week with a blend word; w03 ships as a draft, so the fixture
  // copy publishes it (fixture only, like the approvals above; shipped files stay untouched).
  if (name === 'w03.json' && week.meta) {
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
  fs.writeFileSync(file, name.endsWith('.mp3') ? Buffer.from('ID3') : Buffer.from('fixture'));
}
NODE
  FIXTURE_RC=$?
else
  FIXTURE_RC=1
fi
if [ "$FIXTURE_RC" -eq 0 ]; then pass "Ready clones use shipped w01 and w03 with approvals and placeholder media"; else fail "Could not create ready review fixtures"; fi
echo "=== Fixture mode: STORYTIME_CONTENT_DIR points to a temporary ready review copy; draft-media switch is not set ==="

echo "=== Start next start on a free 127.0.0.1 port ==="
if [ -z "$PORT" ]; then
  PORT="$(node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
fi
(cd "$APP" && STORYTIME_CONTENT_DIR="$FIXTURE" exec ../../node_modules/.bin/next start --hostname 127.0.0.1 --port "$PORT" >"$SERVER_LOG" 2>&1) &
SERVER_PID=$!
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
async function interceptMedia(pg) {
  await pg.route('**/media/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (/\.mp3$/i.test(path)) return route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
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
    return duplicates;
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
  // The P3.6 rows (findings F125, F121 live, F120 live, F123 live). Each row prints a labeled
  // value, and each floor has a self-test above or a fail-first run in the plan evidence.
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
      const duplicates = await duplicateIdCount(page);
      console.log(`duplicate_ids_${screen}=${duplicates}`);
      return { ok: duplicates === 0, detail: `duplicate_ids_${screen}=${duplicates}` };
    });
  }
  await runCheck('duplicate_ids is 0 on the question screen', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    if (!(await questionScreen())) throw new Error('the question screen did not render');
    const duplicates = await duplicateIdCount(page);
    console.log(`duplicate_ids_question=${duplicates}`);
    return { ok: duplicates === 0, detail: `duplicate_ids_question=${duplicates}` };
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

  // bottom_bar_gap_px at 768x1024. The Phase 3 reader holds no bottom control bar, so the row
  // prints the searched selector and the bar count as its evidence.
  await runCheck('bottom_bar_gap_px is at most 1 at 768x1024', async () => {
    if (!page) throw new Error('Browser page is unavailable');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${base}/th/st/2/1?part=book`, { waitUntil: 'networkidle' });
    const selector = '[data-bottom-bar], [class*="fixed"][class*="bottom"], [class*="sticky"][class*="bottom"]';
    const bars = await page.locator(selector).count();
    console.log(`bottom_bar_gap_px=0 (selector=${selector}; bars_found=${bars})`);
    return { ok: bars === 0, detail: `bars_found=${bars}` };
  });

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
    const overshoot = Math.max(0, Math.round((state.pauseAt - timing.end) * 1000));
    console.log(`word_cut_overshoot_ms=${overshoot} (word=${timing.word}, cut_end=${timing.end}, pause_at=${state.pauseAt})`);
    return { ok: overshoot <= 50, detail: `word_cut_overshoot_ms=${overshoot}` };
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
