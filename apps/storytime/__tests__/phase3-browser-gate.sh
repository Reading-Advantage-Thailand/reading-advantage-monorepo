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

echo "=== Create ready review fixture from shipped w01 ==="
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
else
  FIXTURE_RC=1
fi
if [ "$FIXTURE_RC" -eq 0 ]; then pass "Ready clone uses shipped w01 with approvals and placeholder media"; else fail "Could not create ready review fixture"; fi
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
const browser = await chromium.launch({ channel: 'chrome', headless: true });
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
  ]);
  const selfTestServer = http.createServer((req, res) => {
    const html = selfTestPages.get(new URL(req.url, 'http://127.0.0.1').pathname) ?? '';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
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
    ['30 px button', '/button', async p => (await p.locator('button').boundingBox()).width >= 64],
    ['400 KB script', '/large-script', async p => p._transferredBytes <= 300000],
    ['white text on #3080ff', '/contrast', async p => ratio(await p.locator('p').evaluate(e=>getComputedStyle(e).color), await p.locator('p').evaluate(e=>getComputedStyle(e).backgroundColor)) >= 4.5],
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
  PROJECT_DEV_URL="http://127.0.0.1:$PORT" timeout 15m node "$PLAYWRIGHT"
  PW_RC=$?
  if [ "$PW_RC" -eq 0 ]; then pass "Playwright gate exits 0"; else fail "Playwright gate exits $PW_RC"; fi
else
  fail "Playwright step not run because the server is unavailable"
fi

printf '%s\n' "${RESULTS[@]}"
echo "PASS=$PASS_COUNT, FAIL=$FAIL_COUNT"
exit "$FAILED"
