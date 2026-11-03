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
PLAYWRIGHT="$TMP_DIR/gate.mjs"

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
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
const base = process.env.PROJECT_DEV_URL;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let pass = 0, fail = 0;
const results = [];
function record(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` (${detail})` : ''}`);
  ok ? pass++ : fail++;
}
function area(box) { return box ? Math.min(box.width, box.height) : 0; }
function ratio(fg, bg) {
  const lum = (rgb) => {
    const c = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
  };
  const a = lum(fg), b = lum(bg); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
try {
  // The three deliberately bad inline pages must fail their respective limits before live checks.
  for (const [name, html, check] of [
    ['30 px button', '<button style="width:30px;height:30px">x</button>', async p => (await p.locator('button').boundingBox()).width >= 64],
    ['400 KB script', `<script>window.payload='${'x'.repeat(400000)}'</script>`, async p => p._payloadBytes <= 300000],
    ['white text on #3080ff', '<p style="color:white;background:#3080ff">x</p>', async p => ratio(await p.locator('p').evaluate(e=>getComputedStyle(e).color), await p.locator('p').evaluate(e=>getComputedStyle(e).backgroundColor)) >= 4.5],
  ]) {
    const p = await browser.newPage();
    let bytes = 0;
    p.on('response', async r => { try { bytes += (await r.body()).byteLength; } catch {} });
    await p.setContent(`<!doctype html>${html}`);
    await p.waitForLoadState('load');
    p._payloadBytes = new TextEncoder().encode(await p.content()).byteLength;
    const improperlyPassed = await check(p);
    record(`self-test rejects ${name}`, !improperlyPassed);
    await p.close();
  }

  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  const requests = [];
  const responses = [];
  let tapped = false;
  const isMedia = r => /\.(mp3|wav|mp4|webm|png|jpe?g|webp|avif)(?:\?|$)/i.test(r.url()) || ['image','media'].includes(r.resourceType());
  page.on('request', r => requests.push({ url: r.url(), media: isMedia(r), afterTap: tapped }));
  page.on('response', async r => { try { responses.push({ url: r.url(), bytes: (await r.body()).byteLength }); } catch {} });
  await page.goto(`${base}/th/st/2/1`, { waitUntil: 'networkidle' });
  const firstLoadBytes = responses.reduce((sum, r) => sum + r.bytes, 0);
  const beforeTapMedia = requests.filter(r => r.media).length;
  console.log(`transferred_bytes_first_load=${firstLoadBytes}`);
  console.log(`media_requests_before_tap=${beforeTapMedia}`);
  console.log(`requests_total=${requests.length}`);
  record('AC-5.3 first-load transfer is at most 300000 bytes', firstLoadBytes <= 300000, `transferred_bytes_first_load=${firstLoadBytes}`);
  record('AC-5.3 no media request occurs before tap', beforeTapMedia === 0, `media_requests_before_tap=${beforeTapMedia}`);
  record('first-load request log is non-empty', requests.length >= 5, `requests_total=${requests.length}`);
  const tile = page.locator('a[href*="part=book"]').first();
  await tile.waitFor();
  const tilePath = await tile.getAttribute('href');
  tapped = true;
  await tile.click();
  await page.waitForLoadState('networkidle');
  const mediaAfterTap = requests.findIndex(r => r.media);
  console.log(`first_media_request_index=${mediaAfterTap}`);
  record('first media request occurs after the tap', mediaAfterTap >= 0 && requests[mediaAfterTap].afterTap, `first_media_request_index=${mediaAfterTap}`);

  for (const viewport of [{ width: 360, height: 800 }, { width: 800, height: 360 }]) {
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
    record(`64 px tiles at ${viewport.width}x${viewport.height}`, tiles.length >= 3 && minTile >= 64);
    record(`64 px speakers at ${viewport.width}x${viewport.height}`, speakers.length >= 1 && minSpeaker >= 64);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: 'networkidle' });
  const phoneRatio = await page.locator('.song-stage').evaluate(e => { const r=e.getBoundingClientRect(); return Math.round(r.width/r.height*1000); });
  const phoneHeightPct = await page.locator('.song-stage').evaluate(e => Math.round(e.getBoundingClientRect().height/innerHeight*100));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: 'networkidle' });
  const laptopRatio = await page.locator('.song-stage').evaluate(e => { const r=e.getBoundingClientRect(); return Math.round(r.width/r.height*1000); });
  console.log(`video_box_ratio_x1000_phone=${phoneRatio}`);
  console.log(`video_box_height_pct_phone=${phoneHeightPct}`);
  console.log(`video_box_ratio_x1000_laptop=${laptopRatio}`);
  record('AC-8.2 phone video box ratio', Math.abs(phoneRatio-562)<=5, `video_box_ratio_x1000_phone=${phoneRatio}`);
  record('AC-8.2 phone video height', phoneHeightPct<=75, `video_box_height_pct_phone=${phoneHeightPct}`);
  record('AC-8.2 laptop video box ratio', Math.abs(laptopRatio-1778)<=5, `video_box_ratio_x1000_laptop=${laptopRatio}`);
  await context.close();
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
