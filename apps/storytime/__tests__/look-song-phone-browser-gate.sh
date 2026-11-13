#!/usr/bin/env bash
set -uo pipefail

# The narrow browser gate of finding 3 of task 6.2 (the phone song video size).
#
# Daniel, Tasks id ZWE4S0REdDNTQy1ZWDFVNg, 2026-11-13 08:59: "In the song section, on mobile, the
# song video is now tiny and takes up 1/3 of vertical and horizontal space, meaning is actually
# 1/9 scale, and no details are visible."
#
# The gate follows the signed-in pattern of look-phase1-browser-gate.sh: a throwaway Postgres, a
# stand-in for the storage, one seeded account, the production build, and system Chrome.
#
# The PM correction of 2026-11-13: "On a phone in PORTRAIT play the approved 9:16 phone file
# song-phone.mp4 at full screen width (about 390 x 693 at 390 x 844; cap the height at about 82 %
# of the viewport so the Play control and the active lyric line stay reachable, lyrics under or
# over the lower edge). In LANDSCAPE play the 16:9 file at full height. Desktop unchanged."
#
# Row 1: at 390x844 the video box of /th/st/2/1?part=song fills the width of the viewport
#        (song_video_width_ratio from 0.95 up to 1.00).
# Row 2: at 390x844 the video box has the 9:16 shape (song_video_aspect within 0.02 of 0.5625),
#        plays song-phone.mp4, and stays at 0.85 of the viewport height or less
#        (song_video_height_ratio_portrait).
# Row 3: at 844x390 the video box fills the height of the viewport (song_video_height_ratio from
#        0.95 up to 1.00). The page has no fixed chrome, so the viewport height is the reference.
# Row 4: at 844x390 the video box has the 16:9 shape (song_video_aspect_landscape within 0.02 of
#        1.778) and plays song.mp4.
# Row 5: the verdict self-check rejects the wrong values (no vacuous rows).
# Row 6 and row 7 (round 3, N1 of the browser check of st-review-66661c61): at 844x390 the label of
#        the song Play button fits inside its button, in Thai (/th) and in English (/en). The
#        measure is the box of the label text (a range over the button contents) against the box
#        of the button. `play_label_overflow_px_<locale>` is the largest distance by which the
#        label passes the left or the right edge of the button (0 when it fits). The browser
#        check measured the Thai label 6 px past the border and "Play" 17 px past it.
#
# Row 8 and row 9 (round 4, finding B1 of the UX browser check r2 of a690cb30): at 1440x900 a
#        real mouse click on the play mark does nothing. The UX words: "The song stayed paused,
#        with ct at 0.99 before and after. ... The rule `main[data-place] button:active:not(:disabled)
#        { translate: 0 3px }` replaces the centring translate of the mark. While the button is
#        down, the mark moves from x=672, y=497 to x=720, y=548. The release lands on the video, so
#        no handler runs." The jsdom rows of p6-r3-song-poster-tap.test.tsx cannot see CSS.
#        Row 8: the centre of the mark box between mouse down and mouse up stays within 1 px of
#        its centre before the press (`play_mark_press_shift_px`, the UX check measured 70 px).
#        Row 9: a mouse press (down, then up at the same point) on the centre of the mark starts
#        the song: `play_mark_click_plays` is 1 when the video is not paused and its currentTime
#        advanced after the click (`play_mark_click_advance_s`).
#
# No row plays a recording. A headless run is not phone evidence.
#
# The whole script (Postgres, build, server, Playwright) runs inside one heavy-run job. Without
# --locked the script re-enters through heavy-run.sh.
if [ "${1:-}" != "--locked" ]; then
  exec env HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 \
    bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" \
    -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
TMP_DIR="$(mktemp -d -t storytime-song-phone-XXXXXX)"
CONTAINER="storytime-song-phone-gate-$$"
APP_PORT=""
DB_PORT=""
STORAGE_PORT=""
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
STORAGE_PID=""
STORAGE_PGID=""
STORAGE_PORT_RUN=""
PLAYWRIGHT="$APP/.next/look-song-phone-browser-gate-$$.mjs"
MEDIA_ROOT="${STORYTIME_GATE_MEDIA_ROOT:-$HOME/Desktop/handoff/w01-storytime-app-package-r2}"

# Stops the whole process group of one process and waits for its port to close.
# Next starts its own `next-server` child, so a kill of the parent leaves the child alive.
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
    if ss -ltn 2>/dev/null | grep -qE ":${port}[[:space:]]"; then
      echo "port_still_open=$port"
    else
      echo "port_closed=$port"
    fi
  fi
}

cleanup() {
  stop_group "$SERVER_PID" "$SERVER_PGID" "$SERVER_PORT"
  stop_group "$STORAGE_PID" "$STORAGE_PGID" "$STORAGE_PORT_RUN"
  podman rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -f "$PLAYWRIGHT"
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

free_port() {
  node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();});'
}

echo "=== Start the throwaway database ==="
DB_PORT="$(free_port)"
if podman run -d --name "$CONTAINER" -p "127.0.0.1:$DB_PORT:5432" \
  -e POSTGRES_PASSWORD=storytime -e POSTGRES_DB=storytime \
  docker.io/library/postgres:16-alpine >/dev/null 2>&1; then
  pass "The throwaway database container starts"
else
  fail "The throwaway database container does not start"
  printf '%s\n' "${RESULTS[@]}"
  echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
  exit "$FAILED"
fi
DB_READY=0
for _ in $(seq 1 60); do
  if podman exec "$CONTAINER" pg_isready -U postgres -d storytime >/dev/null 2>&1; then DB_READY=1; break; fi
  sleep 1
done
if [ "$DB_READY" -eq 1 ]; then pass "The throwaway database answers"; else fail "The throwaway database does not answer"; fi
DB_URL="postgres://postgres:storytime@127.0.0.1:$DB_PORT/storytime"

echo "=== Apply the Storytime migration twice ==="
MIGRATE_OK=1
for _ in 1 2; do
  if ! (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" pnpm --filter @reading-advantage/db storytime:migrate >"$TMP_DIR/migrate.log" 2>&1); then
    MIGRATE_OK=0
  fi
done
if [ "$MIGRATE_OK" -eq 1 ]; then pass "The migration runs twice and exits 0"; else fail "The migration fails"; fi

echo "=== Seed the account of the gate (temp folder outside the repository) ==="
mkdir -p "$TMP_DIR/accounts"
cat > "$TMP_DIR/accounts/accounts.csv" <<'CSV'
name,class,role
Staff One,staff,family
CSV
if (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" ./node_modules/.bin/tsx apps/storytime/scripts/make-accounts.ts --folder "$TMP_DIR/accounts" --database-url-env STORYTIME_DATABASE_URL >"$TMP_DIR/accounts.log" 2>&1); then
  pass "The account script exits 0"
else
  fail "The account script fails"
fi
ACCOUNTS_CREATED=0
if [ -f "$TMP_DIR/accounts/sign-in-cards.csv" ]; then
  ACCOUNTS_CREATED=$(($(wc -l < "$TMP_DIR/accounts/sign-in-cards.csv") - 1))
fi
echo "accounts_created=$ACCOUNTS_CREATED"

echo "=== Start the stand-in for the storage ==="
STORAGE_PORT_RUN="$(free_port)"
cat > "$TMP_DIR/stand-in.mjs" <<'NODE'
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = process.argv[2];
const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const signature = url.searchParams.get("X-Amz-Signature");
  const expires = Number(url.searchParams.get("X-Amz-Expires") ?? "0");
  if (!signature || !Number.isFinite(expires) || expires > 21600) {
    console.log(`REQ status=403 range=none path=${url.pathname}`);
    response.writeHead(403, { "content-type": "text/plain" });
    response.end("forbidden");
    return;
  }
  const key = decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(/^[^/]+\//, "");
  const file = path.join(root, key);
  if (!file.startsWith(root) || !fs.existsSync(file)) {
    console.log(`REQ status=404 range=none path=${url.pathname}`);
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
    return;
  }
  const size = fs.statSync(file).size;
  const range = request.headers.range;
  const headers = { "accept-ranges": "bytes", "content-type": "application/octet-stream" };
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? Number(match[1]) : 0;
    const end = match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    headers["content-range"] = `bytes ${start}-${end}/${size}`;
    headers["content-length"] = String(end - start + 1);
    console.log(`REQ status=206 range=${range} path=${url.pathname}`);
    response.writeHead(206, headers);
    fs.createReadStream(file, { start, end }).pipe(response);
    return;
  }
  headers["content-length"] = String(size);
  console.log(`REQ status=200 range=none path=${url.pathname}`);
  response.writeHead(200, headers);
  fs.createReadStream(file).pipe(response);
});
server.listen(Number(process.argv[3]), "127.0.0.1");
NODE
setsid bash -c "echo \$\$ > '$TMP_DIR/storage.pid'; exec node '$TMP_DIR/stand-in.mjs' '$MEDIA_ROOT' '$STORAGE_PORT_RUN' > '$TMP_DIR/stand-in.log' 2>&1" &
for _ in $(seq 1 20); do
  [ -s "$TMP_DIR/storage.pid" ] && break
  sleep 0.2
done
STORAGE_PID="$(cat "$TMP_DIR/storage.pid" 2>/dev/null)"
STORAGE_PGID="$(ps -o pgid= -p "$STORAGE_PID" 2>/dev/null | tr -d ' ')"
[ -n "$STORAGE_PGID" ] || STORAGE_PGID="$STORAGE_PID"
sleep 1
if kill -0 "$STORAGE_PID" 2>/dev/null; then pass "The stand-in for the storage starts"; else fail "The stand-in for the storage does not start"; fi

echo "=== Build the production app ==="
if (cd "$APP" && ../../node_modules/.bin/next build >"$TMP_DIR/build.log" 2>&1); then
  pass "The production build exits 0"
else
  fail "The production build fails"
  tail -30 "$TMP_DIR/build.log" || true
fi

echo "=== Start next start on a free port in its own process group ==="
APP_PORT="$(free_port)"
setsid bash -c "echo \$\$ > '$TMP_DIR/server.pid'; cd '$APP' && STORYTIME_DATABASE_URL='$DB_URL' \
  STORYTIME_MEDIA_BASE='gs://storytime-app-media' \
  STORYTIME_STORAGE_ENDPOINT='http://127.0.0.1:$STORAGE_PORT_RUN' \
  STORYTIME_STORAGE_ACCESS_KEY='local-access-key' \
  STORYTIME_STORAGE_SECRET_KEY='local-secret-key' \
  exec ../../node_modules/.bin/next start --hostname 127.0.0.1 -p '$APP_PORT' > '$TMP_DIR/next-start.log' 2>&1" &
for _ in $(seq 1 20); do
  [ -s "$TMP_DIR/server.pid" ] && break
  sleep 0.2
done
SERVER_PID="$(cat "$TMP_DIR/server.pid" 2>/dev/null)"
SERVER_PGID="$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ')"
[ -n "$SERVER_PGID" ] || SERVER_PGID="$SERVER_PID"
SERVER_PORT="$APP_PORT"
APP_UP=0
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://localhost:$APP_PORT/th/sign-in"; then APP_UP=1; break; fi
  sleep 1
done
if [ "$APP_UP" -eq 1 ]; then pass "The app answers on its port"; else fail "The app does not answer on its port"; fi

echo "=== Run the rows 1 to 9 with SYSTEM Chrome ==="
cat > "$PLAYWRIGHT" <<'NODE'
import fs from "node:fs";
import { chromium, request as playwrightRequest } from "@playwright/test";

const base = process.argv[2];
const cardsPath = process.argv[3];
const USER = "staff-01";
const PASS = (() => {
  for (const line of fs.readFileSync(cardsPath, "utf8").trim().split("\n").slice(1)) {
    const parts = line.split(",");
    if (parts[0] === USER) return parts[parts.length - 1];
  }
  return "";
})();
let rowCount = 0;
function emit(name, value) { console.log(`${name}=${value}`); }
function row(number, ok, detail) {
  rowCount += 1;
  console.log(`${ok ? "PASS" : "FAIL"}: row ${number} ${detail}`);
}


/** The verdict of row 1. */
function widthVerdict(v) { return v.ready === true && v.widthRatio >= 0.95 && v.widthRatio <= 1.0001; }
/** The verdict of row 2. */
function portraitShapeVerdict(v) {
  return v.ready === true && Math.abs(v.aspect - 9 / 16) <= 0.02 && v.file === "song-phone.mp4" &&
    v.heightRatio <= 0.85;
}
/** The verdict of row 3. */
function heightVerdict(v) { return v.ready === true && v.heightRatio >= 0.95 && v.heightRatio <= 1.0001; }
/** The verdict of rows 6 and 7: the label text sits inside the button box (half a px of slack). */
function labelFitsVerdict(v) {
  return v.ready === true && v.textLength > 0 && v.overflow <= 0.5;
}
/** The verdict of row 4. */
function landscapeShapeVerdict(v) {
  return v.ready === true && Math.abs(v.aspect - 16 / 9) <= 0.02 && v.file === "song.mp4";
}

/** The verdict of row 8: the mark stays within 1 px of its centre while the mouse is down. */
function pressShiftVerdict(v) {
  return v.ready === true && v.found === true && v.shift >= 0 && v.shift <= 1;
}
/** The verdict of row 9: a mouse click on the mark starts the song and the time advances. */
function clickPlaysVerdict(v) {
  return v.ready === true && v.found === true && v.paused === false && v.advance > 0.2;
}

const goodControls = [
  pressShiftVerdict({ ready: true, found: true, shift: 0 }),
  pressShiftVerdict({ ready: true, found: true, shift: 0.8 }),
  clickPlaysVerdict({ ready: true, found: true, paused: false, advance: 1.2 }),
  widthVerdict({ ready: true, widthRatio: 1 }),
  portraitShapeVerdict({ ready: true, aspect: 390 / 693, file: "song-phone.mp4", heightRatio: 0.82 }),
  heightVerdict({ ready: true, heightRatio: 0.97 }),
  landscapeShapeVerdict({ ready: true, aspect: 16 / 9, file: "song.mp4" }),
  labelFitsVerdict({ ready: true, textLength: 4, overflow: 0 }),
  labelFitsVerdict({ ready: true, textLength: 10, overflow: 0.4 }),
];
const mutants = [
  widthVerdict({ ready: true, widthRatio: 0.32 }) === false,
  widthVerdict({ ready: false, widthRatio: 1 }) === false,
  widthVerdict({ ready: true, widthRatio: 124 / 390 }) === false,
  widthVerdict({ ready: true, widthRatio: 1.4 }) === false,
  portraitShapeVerdict({ ready: true, aspect: 16 / 9, file: "song-phone.mp4", heightRatio: 0.82 }) === false,
  portraitShapeVerdict({ ready: true, aspect: 390 / 693, file: "song.mp4", heightRatio: 0.82 }) === false,
  portraitShapeVerdict({ ready: true, aspect: 390 / 693, file: "song-phone.mp4", heightRatio: 0.95 }) === false,
  heightVerdict({ ready: true, heightRatio: 176 / 390 }) === false,
  heightVerdict({ ready: true, heightRatio: 1.4 }) === false,
  landscapeShapeVerdict({ ready: true, aspect: 9 / 16, file: "song.mp4" }) === false,
  landscapeShapeVerdict({ ready: true, aspect: 16 / 9, file: "song-phone.mp4" }) === false,
  labelFitsVerdict({ ready: true, textLength: 4, overflow: 17 }) === false,
  labelFitsVerdict({ ready: true, textLength: 10, overflow: 6 }) === false,
  labelFitsVerdict({ ready: false, textLength: 4, overflow: 0 }) === false,
  labelFitsVerdict({ ready: true, textLength: 0, overflow: 0 }) === false,
  pressShiftVerdict({ ready: true, found: true, shift: Math.hypot(48, 51) }) === false,
  pressShiftVerdict({ ready: true, found: true, shift: 3 }) === false,
  pressShiftVerdict({ ready: true, found: true, shift: -1 }) === false,
  pressShiftVerdict({ ready: true, found: false, shift: 0 }) === false,
  pressShiftVerdict({ ready: false, found: true, shift: 0 }) === false,
  clickPlaysVerdict({ ready: true, found: true, paused: true, advance: 1.2 }) === false,
  clickPlaysVerdict({ ready: true, found: true, paused: false, advance: 0 }) === false,
  clickPlaysVerdict({ ready: true, found: false, paused: false, advance: 1.2 }) === false,
  clickPlaysVerdict({ ready: false, found: true, paused: false, advance: 1.2 }) === false,
];

if (!PASS) {
  console.log(`FAIL: card list the temp card list holds no ${USER}`);
  process.exit(1);
}

async function signIn(page, next = "/th/st/2/1") {
  await page.context().clearCookies();
  await page.goto(`${base}/th/sign-in?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  const answer = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/api/auth/sign-in"),
    { timeout: 20000 },
  );
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/sign-in"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await answer;
}


/**
 * Measures the video box of the song part at one viewport.
 * @param page The Playwright page of the signed-in session.
 * @param width The viewport width in CSS px.
 * @param height The viewport height in CSS px.
 * @returns The box of the video, the viewport, and the ready flag.
 */
async function measureSong(page, width, height, locale = "th") {
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/${locale}/st/2/1?part=song`, { waitUntil: "load" });
  await page.waitForSelector(".song-stage video", { timeout: 20000 });
  await page.waitForFunction(
    () => {
      const stage = document.querySelector(".song-stage");
      return stage !== null && stage.getAttribute("data-phone") !== null;
    },
    undefined,
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForFunction(
    () => { const v = document.querySelector(".song-stage video"); return v !== null && v.readyState >= 1; },
    undefined,
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const video = document.querySelector(".song-stage video");
    const stage = document.querySelector(".song-stage");
    const box = video ? video.getBoundingClientRect() : { width: 0, height: 0 };
    const button = document.querySelector(".song-part > button");
    let overflow = -1;
    let textLength = 0;
    if (button) {
      const range = document.createRange();
      range.selectNodeContents(button);
      const label = range.getBoundingClientRect();
      const frame = button.getBoundingClientRect();
      textLength = (button.textContent || "").trim().length;
      overflow = Math.max(0, label.right - frame.right, frame.left - label.left);
    }
    return {
      labelOverflow: overflow,
      labelTextLength: textLength,
      ready: video !== null && video.readyState >= 1,
      phone: stage ? stage.getAttribute("data-phone") : "",
      videoW: box.width,
      videoH: box.height,
      viewW: window.innerWidth,
      viewH: window.innerHeight,
      src: video ? (video.currentSrc || video.getAttribute("src") || "").replace(/\?.*$/, "").split("/").pop() : "",
    };
  });
}

/**
 * Presses the play mark with a real mouse at one viewport (down, measure, then up at the same
 * point) and reads the state of the song after the release.
 * @param page The Playwright page of the signed-in session.
 * @param width The viewport width in CSS px.
 * @param height The viewport height in CSS px.
 * @returns The shift of the mark centre while the mouse is down, and the state after the click.
 */
async function pressPlayMark(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: "load" });
  await page.waitForSelector(".song-stage video", { timeout: 20000 });
  await page.waitForFunction(
    () => { const v = document.querySelector(".song-stage video"); return v !== null && v.readyState >= 1; },
    undefined,
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(800);
  const centreOf = () => page.evaluate(() => {
    const mark = document.querySelector("[data-play-mark]");
    if (!mark) return null;
    const box = mark.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  });
  const state = () => page.evaluate(() => {
    const video = document.querySelector(".song-stage video");
    return video ? { paused: video.paused, time: video.currentTime, ready: video.readyState >= 1 } : null;
  });
  const before = await centreOf();
  const start = await state();
  if (!before || !start) return { found: false, ready: start ? start.ready : false, shift: -1, paused: true, advance: 0 };
  await page.mouse.move(before.x, before.y);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const during = await centreOf();
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const after = await state();
  return {
    found: true,
    ready: start.ready,
    shift: during ? Math.hypot(during.x - before.x, during.y - before.y) : -1,
    paused: after ? after.paused : true,
    advance: after ? after.time - start.time : 0,
    x: Math.round(before.x),
    y: Math.round(before.y),
    duringX: during ? Math.round(during.x) : -1,
    duringY: during ? Math.round(during.y) : -1,
  };
}

const rejected = mutants.filter(Boolean).length;
emit("controls_ok", goodControls.every(Boolean) ? 1 : 0);
emit("mutants_rejected", rejected);
emit("mutants_checked", mutants.length);

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
let portrait = null;
try {
  await signIn(page, "/th/st/2/1");
  portrait = await measureSong(page, 390, 844);
} catch (error) {
  console.log(`portrait_error=${String(error).slice(0, 160)}`);
}
if (portrait) {
  emit("portrait_phone_flag", portrait.phone);
  emit("portrait_video_file", portrait.src);
  emit("portrait_video_w_px", Math.round(portrait.videoW));
  emit("portrait_video_h_px", Math.round(portrait.videoH));
}
const widthRatio = portrait ? Number((portrait.videoW / portrait.viewW).toFixed(3)) : 0;
const aspect = portrait && portrait.videoH > 0 ? Number((portrait.videoW / portrait.videoH).toFixed(3)) : 0;
const heightRatioPortrait = portrait ? Number((portrait.videoH / portrait.viewH).toFixed(3)) : 0;
emit("song_video_width_ratio", widthRatio);
emit("song_video_aspect", aspect);
emit("song_video_height_ratio_portrait", heightRatioPortrait);
const portraitReady = portrait ? portrait.ready : false;
row(1, widthVerdict({ ready: portraitReady, widthRatio }), `song_video_width_ratio=${widthRatio} at 390x844`);
row(2, portraitShapeVerdict({ ready: portraitReady, aspect, file: portrait ? portrait.src : "", heightRatio: heightRatioPortrait }),
  `song_video_aspect=${aspect} (9:16 is 0.5625) song_video_file=${portrait ? portrait.src : ""} song_video_height_ratio_portrait=${heightRatioPortrait} at 390x844`);

let landscape = null;
try {
  landscape = await measureSong(page, 844, 390);
} catch (error) {
  console.log(`landscape_error=${String(error).slice(0, 160)}`);
}
if (landscape) {
  emit("landscape_video_file", landscape.src);
  emit("landscape_video_w_px", Math.round(landscape.videoW));
  emit("landscape_video_h_px", Math.round(landscape.videoH));
}
const heightRatio = landscape ? Number((landscape.videoH / landscape.viewH).toFixed(3)) : 0;
const aspectLandscape = landscape && landscape.videoH > 0 ? Number((landscape.videoW / landscape.videoH).toFixed(3)) : 0;
emit("song_video_height_ratio", heightRatio);
emit("song_video_aspect_landscape", aspectLandscape);
const landscapeReady = landscape ? landscape.ready : false;
row(3, heightVerdict({ ready: landscapeReady, heightRatio }), `song_video_height_ratio=${heightRatio} at 844x390`);
row(4, landscapeShapeVerdict({ ready: landscapeReady, aspect: aspectLandscape, file: landscape ? landscape.src : "" }),
  `song_video_aspect_landscape=${aspectLandscape} (16:9 is 1.778) song_video_file=${landscape ? landscape.src : ""} at 844x390`);

row(5, goodControls.every(Boolean) && rejected === mutants.length, `verdict self-check mutants_rejected=${rejected} of ${mutants.length}`);

for (const locale of ["th", "en"]) {
  let shot = null;
  try {
    shot = locale === "th" ? landscape : await measureSong(page, 844, 390, locale);
  } catch (error) {
    console.log(`label_${locale}_error=${String(error).slice(0, 160)}`);
  }
  const overflow = shot ? Number(shot.labelOverflow.toFixed(1)) : -1;
  const textLength = shot ? shot.labelTextLength : 0;
  emit(`play_label_overflow_px_${locale}`, overflow);
  row(locale === "th" ? 6 : 7, labelFitsVerdict({ ready: shot ? shot.labelOverflow >= 0 : false, textLength, overflow }),
    `play_label_overflow_px_${locale}=${overflow} label_text_length=${textLength} at 844x390 (/${locale})`);
}
let pressed = null;
try {
  pressed = await pressPlayMark(page, 1440, 900);
} catch (error) {
  console.log(`play_mark_error=${String(error).slice(0, 160)}`);
}
const press = pressed ?? { found: false, ready: false, shift: -1, paused: true, advance: 0 };
const pressShift = Number(press.shift.toFixed(1));
const clickAdvance = Number(press.advance.toFixed(2));
emit("play_mark_centre_before", `${press.x ?? -1},${press.y ?? -1}`);
emit("play_mark_centre_down", `${press.duringX ?? -1},${press.duringY ?? -1}`);
emit("play_mark_press_shift_px", pressShift);
emit("play_mark_click_advance_s", clickAdvance);
emit("play_mark_click_plays", clickPlaysVerdict(press) ? 1 : 0);
row(8, pressShiftVerdict({ ready: press.ready, found: press.found, shift: pressShift }),
  `play_mark_press_shift_px=${pressShift} at 1440x900 (within 1 px wanted)`);
row(9, clickPlaysVerdict({ ready: press.ready, found: press.found, paused: press.paused, advance: clickAdvance }),
  `play_mark_click_plays=${clickPlaysVerdict(press) ? 1 : 0} paused=${press.paused} play_mark_click_advance_s=${clickAdvance} at 1440x900`);
console.log(`row_count=${rowCount}`);
await browser.close();
NODE
if (cd "$APP" && node "$PLAYWRIGHT" "http://localhost:$APP_PORT" "$TMP_DIR/accounts/sign-in-cards.csv" >"$TMP_DIR/playwright.log" 2>&1); then
  :
fi
cat "$TMP_DIR/playwright.log"
if grep -qE '^FAIL: ' "$TMP_DIR/playwright.log"; then FAILED=1; fi
if grep -qE '^PASS: ' "$TMP_DIR/playwright.log"; then
  while IFS= read -r line; do RESULTS+=("$line"); done < <(grep -E '^(PASS|FAIL): ' "$TMP_DIR/playwright.log")
fi
LOG_PASS=$(grep -cE '^PASS: ' "$TMP_DIR/playwright.log" || true)
LOG_FAIL=$(grep -cE '^FAIL: ' "$TMP_DIR/playwright.log" || true)
PASS_COUNT=$((PASS_COUNT + LOG_PASS))
FAIL_COUNT=$((FAIL_COUNT + LOG_FAIL))
ROWS=$(grep -cE '^(PASS|FAIL): row [0-9]+ ' "$TMP_DIR/playwright.log" || true)
if [ "$ROWS" -gt 0 ]; then
  pass "The browser rows ran (rows=$ROWS)"
else
  fail "The browser rows did not run (rows=0)"
fi
if [ "$ROWS" -ne 9 ]; then fail "The browser rows must be 9, counted $ROWS"; fi

echo "=== The requests of the stand-in for the storage ==="
echo "standin_requests=$(grep -c '^REQ ' "$TMP_DIR/stand-in.log" 2>/dev/null || echo 0)"
echo "standin_206=$(grep -c 'status=206' "$TMP_DIR/stand-in.log" 2>/dev/null || echo 0)"

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"

