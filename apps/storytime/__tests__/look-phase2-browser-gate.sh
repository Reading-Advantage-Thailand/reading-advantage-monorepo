#!/usr/bin/env bash
set -uo pipefail

# The browser gate of look Phase 2 (test strategy P2.4, task 2.2b; AC-2.2, AC-2.6 to AC-2.8).
#
# The gate runs the built app against a throwaway Postgres and a local stand-in for the storage.
# It follows the signed-in pattern of phase2b-browser-gate.sh and look-phase1-browser-gate.sh:
# it seeds an account, signs in once, and gives the session cookie to each new browser context.
#
# Rows (each prints PASS: or FAIL: with labeled values):
#   1 captures    SCREENS x VIEWPORTS x LOCALES (24): console_errors, broken_pictures, tap_under_48,
#                 clipped_text, page_overflow, and contrast_fail are all 0.
#   2 hero        song_stage_height_px 220 to 240, hero_band_height_px_phone 92 to 100,
#                 hero_band_height_px_tablet 116 to 124, and the first-view rules.
#   3 frame       the game bar shows the route level and week; the plaque holds the week title.
#   4 assets      every place, SVG, and font that the built CSS requests answers 200 with its type.
#   5 reader      gap_max_delta_px, word_hit_h_px_min, and the touch marker of a clip word.
#   6 plain text  the computed text rules of the sentence, the words, the chips, and the lyrics.
#   7 motion      reduced motion stops every animation; the positive control shows a running one.
#   8 other       sign_in, join, and not_found under the shared global CSS.
#   9 missing     with the place images aborted, the text stays readable.
#  10 question    the question screen shows the same hero band and passes the row 1 checks.
#  11 self-test   the verdict functions reject 23 captures, a hero height of 172, and no rows.
#
# No row plays a recording (M21). The song row sets currentTime and fires timeupdate (Q33).
# A headless run is not phone evidence. The gate reads no file under ~/Desktop/handoff except the
# Phase 1 media root (STORYTIME_GATE_MEDIA_ROOT, default handoff/w01-storytime-app-package-r2).
#
# `--self-test` runs the verdict self-test only (no build, no database, no server).
# The whole run (Postgres, build, server, Playwright) is one heavy-run job. Without --locked the
# script re-enters through heavy-run.sh. Callers run the script plain, with no flock.
MODE="${1:-}"
if [ "$MODE" != "--locked" ] && [ "$MODE" != "--self-test" ]; then
  exec env HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 \
    bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" \
    -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
TMP_DIR="$(mktemp -d -t storytime-look-p2-XXXXXX)"
CONTAINER="storytime-look-p2-gate-$$"
APP_PORT=""
DB_PORT=""
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
STORAGE_PID=""
STORAGE_PGID=""
STORAGE_PORT_RUN=""
FIXTURE="$TMP_DIR/content"
PLAYWRIGHT="$APP/.next/look-phase2-browser-gate-$$.mjs"
MEDIA_ROOT="${STORYTIME_GATE_MEDIA_ROOT:-$HOME/Desktop/handoff/w01-storytime-app-package-r2}"

# The capture matrix of AC-2.2: 4 screens x 3 viewports x 2 locales = 24 captures.
SCREENS=(week reader song decodable)
VIEWPORTS=(390x844 1024x768 844x390)
LOCALES=(th en)
# The extra rows of P2.4 that the check list names.
EXTRA_ROWS=(question not_found sign_in join)
CAPTURES=$(( ${#SCREENS[@]} * ${#VIEWPORTS[@]} * ${#LOCALES[@]} ))
echo "captures=$CAPTURES"
if [ "$CAPTURES" -ne 24 ]; then fail "The capture matrix holds $CAPTURES captures, not 24 (captures=$CAPTURES)"; fi

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

# Writes the Playwright module. The module holds the verdict functions, the self-test, and the rows.
write_playwright() {
mkdir -p "$APP/.next"
cat > "$PLAYWRIGHT" <<'NODE'
import fs from "node:fs";
import { chromium, request as playwrightRequest } from "@playwright/test";

const selfTestOnly = process.argv[2] === "--self-test";
const base = selfTestOnly ? "" : process.argv[2];
const cardsPath = selfTestOnly ? "" : process.argv[3];
const fixtureDir = selfTestOnly ? "" : process.argv[4];
const SCREENS = (process.env.GATE_SCREENS ?? "week reader song decodable").split(" ");
const VIEWPORTS = (process.env.GATE_VIEWPORTS ?? "390x844 1024x768 844x390").split(" ").map((text) => {
  const [width, height] = text.split("x").map(Number);
  return { text, width, height, phone: width < 900 || height < 500 };
});
const LOCALES = (process.env.GATE_LOCALES ?? "th en").split(" ");
const USER = "staff-01";
// The edge threshold T per channel (M39, P2.5). Calibration, read once by Red on 2026-11-08 with the
// in-page function below (mean colour of the outer 16 px strip against the next 16 px strip, the
// largest channel delta over the 4 edges):
//   known good, the 5 trimmed study places q-grove, q-meadow, q-oak, q-path, q-trail: 8.1, 4.7, 6.7, 11.6, 14.6 (max 14.6).
//   known bad, untrimmed A-front-a1-clean.jpg: 7.4 (A-reader-a2-clean 5.2, A-back-a1 8.3). The metric does NOT
//   separate the real untrimmed art from the good places; it sees a solid strip only.
//   synthetic bad control (a 16 px solid strip on the left edge of each good place): 162.5, 173.5, 163.1, 185.7,
//   167.9 (min 162.5). T = 40 sits above the good max and far below the control min.
const EDGE_T = 40;
const PLACE_PINS = { p: 1080, d: 1920 };

let rowCount = 0;
function emit(name, value) { console.log(`${name}=${value}`); }
/** Prints one row with a PASS: or FAIL: marker and its labeled values. */
function row(name, ok, detail) {
  rowCount += 1;
  console.log(`${ok ? "PASS" : "FAIL"}: ${name} ${detail}`);
}

// ---- Verdict functions. The self-test and the live rows share them. ----
const ZERO_KEYS = ["console_errors", "broken_pictures", "tap_under_48", "clipped_text", "page_overflow", "contrast_fail"];
/** The verdict of one capture: all six counts are 0. */
function captureVerdict(v) { return ZERO_KEYS.every((key) => v[key] === 0); }
/** The verdict of the capture count. */
function countVerdict(n) { return n === 24; }
/** The verdict of a measured height against its range. */
function pinVerdict(value, low, high) { return Number.isFinite(value) && value >= low && value <= high; }
/** The verdict of the row set: an empty row set is not a pass (A4). */
function rowsVerdict(n) { return n > 0; }
/** The verdict of an edge scan: 10 files and a delta within T. */
function edgeVerdict(delta, files) { return files === 10 && Number.isFinite(delta) && delta <= EDGE_T; }

const goodCapture = { console_errors: 0, broken_pictures: 0, tap_under_48: 0, clipped_text: 0, page_overflow: 0, contrast_fail: 0 };
const mutants = [
  countVerdict(23) === false,
  pinVerdict(172, 92, 100) === false,
  pinVerdict(172, 220, 240) === false,
  pinVerdict(Number.NaN, 92, 100) === false,
  rowsVerdict(0) === false,
  captureVerdict({ ...goodCapture, tap_under_48: 1 }) === false,
  captureVerdict({ ...goodCapture, contrast_fail: 2 }) === false,
  edgeVerdict(200, 10) === false,
  edgeVerdict(0, 9) === false,
];
const controls = [
  countVerdict(24), pinVerdict(96, 92, 100), pinVerdict(230, 220, 240), pinVerdict(120, 116, 124),
  rowsVerdict(3), captureVerdict(goodCapture), edgeVerdict(10, 10),
];
const controlsOk = controls.every(Boolean);
const rejected = mutants.filter(Boolean).length;
emit("selftest_controls_ok", controlsOk ? 1 : 0);
emit("selftest_mutants_rejected", rejected);
emit("selftest_mutants_checked", mutants.length);
const selfOk = controlsOk && rejected === mutants.length;
row("row 11 self-test the real verdicts accept the good values and reject the mutants", selfOk,
  `selftest_mutants_rejected=${rejected} selftest_mutants_checked=${mutants.length}`);
if (selfTestOnly) {
  emit("row_count", rowCount);
  process.exit(selfOk ? 0 : 1);
}

const PASS = (() => {
  for (const line of fs.readFileSync(cardsPath, "utf8").trim().split("\n").slice(1)) {
    const parts = line.split(",");
    if (parts[0] === USER) return parts[parts.length - 1].replace(/\r$/, "");
  }
  return "";
})();
if (!PASS) {
  console.log(`FAIL: card list the temp card list holds no ${USER}`);
  process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome" });
let cookies = [];

/** Signs in once through the page and keeps the session cookies for later contexts. */
async function signInOnce() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${base}/th/sign-in?next=${encodeURIComponent("/th/st/2/1")}`, { waitUntil: "domcontentloaded" });
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
  cookies = await context.cookies();
  await context.close();
  return cookies.length;
}

/** Makes a browser context for one viewport with the session cookies (signed in) or without. */
async function makeContext(vp, options = {}) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.phone ? 2 : 1,
    isMobile: vp.phone,
    hasTouch: vp.phone,
    reducedMotion: options.reducedMotion ?? "reduce",
  });
  if (options.signedIn !== false) await context.addCookies(cookies);
  return context;
}

/** Watches one page for console errors, page errors, and failed image answers. */
function watch(page, ignoreUrl = "") {
  const state = { errors: [], failed: [] };
  page.on("console", (message) => {
    if (message.type() !== "error" || /ERR_ABORTED/.test(message.text())) return;
    // A 404 page is the page under test: Chrome logs its own 404 answer as a console error.
    if (ignoreUrl && message.location().url === ignoreUrl && /status of 404/.test(message.text())) return;
    state.errors.push(message.text());
  });
  page.on("pageerror", (error) => state.errors.push(String(error)));
  page.on("response", (response) => { if (response.status() >= 400) state.failed.push(`${response.status()} ${response.url()}`); });
  return state;
}

/** The in-page check of the study (capture.mjs), with counters for the contrast pairs. */
function pageChecks() {
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  // A canvas turns any CSS colour (rgb, oklab, color-mix) into rgba, so a modern colour is not read as white.
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  probe.canvas.width = 1; probe.canvas.height = 1;
  const parse = (s) => {
    if (!s || s === "transparent") return [0, 0, 0, 0];
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#000";
    probe.fillStyle = s;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3]));
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  const out = { tap: [], clip: [], contrast: [], contrastImage: 0, contrastPairs: 0, overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth) };
  for (const el of document.querySelectorAll("a[href], button, audio, [data-word]")) {
    if (!visible(el)) continue;
    if (el.closest('form[action="/api/auth/sign-out"]')) continue;
    const r = el.getBoundingClientRect();
    // A read-along word follows the bounded rule (Q27): 48 px of height, and no rule on its width.
    const wide = el.hasAttribute("data-word") ? true : r.width >= 47.5;
    if (r.height < 47.5 || !wide) out.tap.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if ((cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1) || (cs.overflowY !== "visible" && el.scrollHeight > el.clientHeight + 1 && !["VIDEO", "AUDIO", "IMG"].includes(el.tagName))) out.clip.push(`${el.tagName.toLowerCase()} ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const fg = parse(cs.color); if (!fg) continue;
    const layers = []; let node = el; let image = false;
    while (node) {
      const s = getComputedStyle(node);
      const c = parse(s.backgroundColor);
      if (s.backgroundImage !== "none" && (!c || c[3] < 0.99)) { image = true; break; }
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 0.99) break; }
      node = node.parentElement;
    }
    if (image) { out.contrastImage += 1; continue; }
    let bg = [255, 255, 255];
    for (const c of layers.reverse()) bg = over(c, bg);
    const fgc = fg[3] < 1 ? over(fg, bg) : fg;
    const a = lum(fgc), b = lum(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const px = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700;
    const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
    out.contrastPairs += 1;
    if (ratio < need) out.contrast.push(`${ratio.toFixed(2)}<${need} "${el.textContent.trim().slice(0, 24)}"`);
  }
  return out;
}

/** Waits for the fonts and the pictures of the page. */
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 40; i += 1) {
      if ([...document.images].every((im) => im.complete)) break;
      await wait(150);
    }
    for (const v of document.querySelectorAll("video[poster]")) {
      await new Promise((res) => { const im = new Image(); im.onload = im.onerror = res; im.src = v.poster; });
    }
  }).catch(() => {});
  await page.waitForTimeout(400);
}

/** Counts the broken pictures of the page: images and posters that did not load. */
async function brokenPictures(page, failed) {
  const broken = await page.evaluate(async () => {
    const bad = [...document.images].filter((im) => im.complete && im.naturalWidth === 0 && im.src).map((im) => im.src);
    for (const v of document.querySelectorAll("video[poster]")) {
      const ok = await new Promise((res) => { const im = new Image(); im.onload = () => res(true); im.onerror = () => res(false); im.src = v.poster; });
      if (!ok) bad.push(v.poster);
    }
    return bad;
  });
  const imageFails = failed.filter((f) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(f)).map((f) => f.split(" ").pop());
  return new Set([...broken, ...imageFails]).size;
}

const SONG_LINE_TIME = (() => {
  try {
    const week = JSON.parse(fs.readFileSync(`${fixtureDir}/l2/w01.json`, "utf8"));
    const times = week.song.times ?? [];
    return times.length > 1 ? Number(times[1].startTime) + 0.01 : 12;
  } catch { return 12; }
})();

/** Makes line index 1 active: sets currentTime and fires timeupdate (Q33). Plays no recording. */
async function activateLine(page, index) {
  await page.waitForSelector(".song-stage video, .song-stage audio", { timeout: 20000 });
  await page.evaluate((time) => {
    const media = document.querySelector(".song-stage video, .song-stage audio");
    Object.defineProperty(media, "currentTime", { configurable: true, get: () => time, set: () => {} });
    media.dispatchEvent(new Event("timeupdate"));
  }, SONG_LINE_TIME);
  await page.waitForSelector(`li[data-line-index="${index}"][aria-current="true"]`, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => {
    const active = document.querySelector('li[data-line-index][aria-current="true"]');
    return active ? Number(active.getAttribute("data-line-index")) : -1;
  });
}

const QUERY = { week: "", reader: "?part=book", song: "?part=song", decodable: "?part=decodable" };

/** Opens one screen of week 1 of level 2. The reader opens on its second page. */
async function openScreen(page, locale, screen, path = "/st/2/1") {
  await page.goto(`${base}/${locale}${path}${QUERY[screen]}`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  if (screen === "reader") {
    await page.waitForSelector("[data-word]", { timeout: 20000 }).catch(() => {});
    await page.click('button:has-text("→")').catch(() => {});
    await page.waitForFunction(() => {
      const element = document.querySelector('span[aria-live="polite"]');
      return element !== null && element.textContent.trim() === "2 / 8";
    }, undefined, { timeout: 10000 }).catch(() => {});
  }
  let activeLine = -1;
  if (screen === "song") activeLine = await activateLine(page, 1).catch(() => -1);
  await settle(page);
  return { activeLine };
}

/** Opens the question screen of the reader (the end of the book, level 2). */
async function openQuestion(page, locale) {
  await page.goto(`${base}/${locale}/st/2/1?part=book`, { waitUntil: "load" });
  await page.waitForSelector("[data-word]", { timeout: 20000 }).catch(() => {});
  for (let i = 0; i < 12; i += 1) {
    if (await page.$("[data-question-screen]")) break;
    await page.click('button:has-text("→")', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForSelector("[data-question-screen]", { timeout: 5000 }).catch(() => {});
  await settle(page);
  return (await page.$("[data-question-screen]")) !== null;
}

/** Runs the row 1 checks on the open page and returns the six counts. */
async function checkCounts(page, state) {
  const checks = await page.evaluate(pageChecks);
  const broken = await brokenPictures(page, state.failed);
  return {
    console_errors: state.errors.length,
    broken_pictures: broken,
    tap_under_48: checks.tap.length,
    clipped_text: checks.clip.length,
    page_overflow: Math.round(checks.overflowPx),
    contrast_fail: checks.contrast.length,
    contrast_pairs: checks.contrastPairs,
    contrast_skipped: checks.contrastImage,
    sample: [checks.tap[0], checks.clip[0], checks.contrast[0], state.errors[0]].filter(Boolean).join(" | ").slice(0, 160),
  };
}

/** Formats the labeled counts of one capture. */
function countsText(v) {
  return ZERO_KEYS.map((key) => `${key}=${v[key]}`).join(" ") + ` contrast_pairs_checked=${v.contrast_pairs} contrast_skipped=${v.contrast_skipped}`;
}

/** Runs a row body and prints a FAIL row when it raises an error (no crash, no silent skip). */
async function guarded(name, body) {
  try { await body(); } catch (error) { row(name, false, `the row raises an error: ${String(error).slice(0, 160)}`); }
}

// ---- Row 1: the 24 captures. ----
let captureRows = 0;
let totalConsole = 0;
let totalPairs = 0;
let totalSkipped = 0;
await guarded("row 1 sign in", async () => {
  const n = await signInOnce();
  emit("session_cookies", n);
});
await guarded("row 1 captures", async () => {
  for (const vp of VIEWPORTS) {
    const context = await makeContext(vp);
    for (const locale of LOCALES) {
      for (const screen of SCREENS) {
        const page = await context.newPage();
        const state = watch(page);
        let detail = "";
        let ok = false;
        try {
          const opened = await openScreen(page, locale, screen);
          const counts = await checkCounts(page, state);
          totalConsole += counts.console_errors;
          totalPairs += counts.contrast_pairs;
          totalSkipped += counts.contrast_skipped;
          const signedIn = !new URL(page.url()).pathname.endsWith("/sign-in");
          ok = captureVerdict(counts) && signedIn && (screen !== "song" || opened.activeLine === 1);
          detail = `${countsText(counts)}${screen === "song" ? ` active_line_index=${opened.activeLine}` : ""}${counts.sample ? ` first=${JSON.stringify(counts.sample)}` : ""}`;
        } catch (error) {
          detail = `the capture raises an error: ${String(error).slice(0, 120)}`;
        }
        captureRows += 1;
        row(`capture ${screen} ${locale} ${vp.text}`, ok, detail);
        await page.close();
      }
    }
    await context.close();
  }
  emit("captures_run", captureRows);
  emit("console_errors", totalConsole);
  emit("contrast_pairs_checked", totalPairs);
  emit("contrast_skipped", totalSkipped);
  row("row 1 captures_run", countVerdict(captureRows) && totalPairs > 0,
    `captures_run=${captureRows} contrast_pairs_checked=${totalPairs} contrast_skipped=${totalSkipped}`);
});

// ---- Row 2: the hero rows (AC-2.6 to AC-2.8). Measured numbers, not CSS pins (A5). ----
/** Reads the bottom edges and heights of the first-view controls of the open page. */
async function firstView(page) {
  return page.evaluate(() => {
    const NONE = 99999;
    const bottom = (el) => (el ? Math.round(el.getBoundingClientRect().bottom * 10) / 10 : NONE);
    const height = (el) => (el ? Math.round(el.getBoundingClientRect().height * 10) / 10 : 0);
    const buttons = [...document.querySelectorAll("button")];
    const prev = buttons.find((button) => button.textContent.trim() === "←");
    const next = buttons.find((button) => button.textContent.trim() === "→");
    const audio = buttons.filter((button) => button.hasAttribute("aria-pressed"));
    const skip = document.querySelector("[data-question-screen] button:not([data-choice-page])");
    return {
      band: height(document.querySelector('[data-hero="band"]')),
      stage: height(document.querySelector(".song-stage")),
      play_bottom: bottom(document.querySelector(".song-stage ~ button")),
      line_bottom: bottom(document.querySelector('li[data-line-index="1"][aria-current="true"]')),
      arrows_found: (prev ? 1 : 0) + (next ? 1 : 0),
      arrows_bottom: Math.max(prev ? bottom(prev) : NONE, next ? bottom(next) : NONE),
      audio_found: audio.length,
      audio_bottom: audio.length > 0 ? Math.max(...audio.map((button) => bottom(button))) : NONE,
      skip_bottom: bottom(skip),
    };
  });
}

await guarded("row 2 hero", async () => {
  const phone = { text: "390x844", width: 390, height: 844, phone: true };
  const tablet = { text: "1024x768", width: 1024, height: 768, phone: false };
  const phoneContext = await makeContext(phone);
  for (const locale of LOCALES) {
    const page = await phoneContext.newPage();
    // Song: the cover card is 220 to 240 px; Play and the active line sit in the first view.
    const song = await openScreen(page, locale, "song");
    const s = await firstView(page);
    row(`hero song ${locale} 390x844`,
      pinVerdict(s.stage, 220, 240) && s.play_bottom <= 844 && s.line_bottom <= 844 && song.activeLine === 1,
      `song_stage_height_px=${s.stage} play_bottom_px=${s.play_bottom} active_line_bottom_px=${s.line_bottom} active_line_index=${song.activeLine}`);
    // Decodable: the band is 92 to 100 px; the arrows sit in the first view.
    await openScreen(page, locale, "decodable");
    const d = await firstView(page);
    row(`hero decodable ${locale} 390x844`,
      pinVerdict(d.band, 92, 100) && d.arrows_found === 2 && d.arrows_bottom <= 844,
      `hero_band_height_px_phone=${d.band} arrows_found=${d.arrows_found} arrows_bottom_px=${d.arrows_bottom}`);
    // Reader: the band, the arrows, and the audio button row.
    await openScreen(page, locale, "reader");
    const r = await firstView(page);
    row(`hero reader ${locale} 390x844`,
      pinVerdict(r.band, 92, 100) && r.arrows_found === 2 && r.arrows_bottom <= 844 && r.audio_found >= 3 && r.audio_bottom <= 844,
      `hero_band_height_px_phone=${r.band} arrows_found=${r.arrows_found} arrows_bottom_px=${r.arrows_bottom} audio_buttons=${r.audio_found} audio_bottom_px=${r.audio_bottom}`);
    // Question screen: the same band; the skip control sits in the first view (Q34).
    const found = await openQuestion(page, locale);
    const q = await firstView(page);
    row(`hero question ${locale} 390x844`,
      found && pinVerdict(q.band, 92, 100) && q.skip_bottom <= 844,
      `question_screen=${found ? 1 : 0} hero_band_height_px_phone=${q.band} skip_bottom_px=${q.skip_bottom}`);
    await page.close();
  }
  await phoneContext.close();
  const tabletContext = await makeContext(tablet);
  for (const locale of LOCALES) {
    const page = await tabletContext.newPage();
    await openScreen(page, locale, "reader");
    const t = await firstView(page);
    row(`hero reader ${locale} 1024x768`,
      pinVerdict(t.band, 116, 124) && t.audio_found >= 3 && t.audio_bottom <= 768,
      `hero_band_height_px_tablet=${t.band} audio_buttons=${t.audio_found} audio_bottom_px=${t.audio_bottom}`);
    await page.close();
  }
  await tabletContext.close();
});

// ---- Row 3: the frame (game bar and title plaque). ----
/** Reads the numbers of the game bar and the text of the plaque. */
async function readFrame(page) {
  return page.evaluate(() => {
    const bar = document.querySelector("[data-game-bar]");
    const title = document.querySelector("main h1");
    return {
      bars: document.querySelectorAll("[data-game-bar]").length,
      numbers: bar ? (bar.textContent ?? "").match(/\d+/g) ?? [] : [],
      title: title ? (title.textContent ?? "").trim() : "",
    };
  });
}
await guarded("row 3 frame", async () => {
  const vp = VIEWPORTS[0];
  const context = await makeContext(vp);
  const cases = [
    { path: "/st/2/1", locale: "th", level: "2", week: "1", title: "Hello!" },
    { path: "/st/2/1", locale: "en", level: "2", week: "1", title: "Hello!" },
    { path: "/st/3/5", locale: "en", level: "3", week: "5", title: "Second Week" },
  ];
  for (const item of cases) {
    const page = await context.newPage();
    await page.goto(`${base}/${item.locale}${item.path}`, { waitUntil: "load" });
    await settle(page);
    const frame = await readFrame(page);
    row(`frame ${item.locale} level ${item.level} week ${item.week}`,
      frame.bars === 1 && frame.numbers[0] === item.level && frame.numbers[1] === item.week && frame.title === item.title,
      `game_bars=${frame.bars} bar_numbers=${frame.numbers.join(",")} plaque_title=${JSON.stringify(frame.title)}`);
    await page.close();
  }
  // A 60-character title (adversarial seed) causes no overflow and no clipped text.
  const page = await context.newPage();
  const state = watch(page);
  await page.goto(`${base}/en/st/3/6`, { waitUntil: "load" });
  await settle(page);
  const frame = await readFrame(page);
  const counts = await checkCounts(page, state);
  row("frame long title 60 characters",
    frame.title.length === 60 && counts.page_overflow === 0 && counts.clipped_text === 0,
    `title_chars=${frame.title.length} page_overflow=${counts.page_overflow} clipped_text=${counts.clipped_text}`);
  await page.close();
  await context.close();
});

// ---- Row 4: the assets. ----
/** The edge-glitch scan of M39, run in the page: the largest channel delta over the 4 edges. */
async function edgeScan(page, url, paint) {
  return page.evaluate(async ({ url: target, paint: shouldPaint }) => {
    const blob = await (await fetch(target)).blob();
    const dataUrl = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
    const image = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = dataUrl; });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const mean = (x, y, w, h) => {
      const data = context.getImageData(x, y, w, h).data;
      const sum = [0, 0, 0];
      for (let i = 0; i < data.length; i += 4) { sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; }
      const n = data.length / 4;
      return sum.map((value) => value / n);
    };
    if (shouldPaint) {
      // The bad control: one 16 px solid strip on the left edge, in the colour far from its neighbour.
      const next = mean(16, 0, 16, canvas.height);
      const far = next.map((value) => (value < 128 ? 255 : 0));
      context.fillStyle = `rgb(${far.join(",")})`;
      context.fillRect(0, 0, 16, canvas.height);
    }
    const W = canvas.width, H = canvas.height, S = 16;
    const edges = [
      [mean(0, 0, W, S), mean(0, S, W, S)],
      [mean(0, H - S, W, S), mean(0, H - 2 * S, W, S)],
      [mean(0, 0, S, H), mean(S, 0, S, H)],
      [mean(W - S, 0, S, H), mean(W - 2 * S, 0, S, H)],
    ];
    let delta = 0;
    for (const [outer, inner] of edges) for (let c = 0; c < 3; c += 1) delta = Math.max(delta, Math.abs(outer[c] - inner[c]));
    return Math.round(delta * 10) / 10;
  }, { url, paint });
}

await guarded("row 4 assets", async () => {
  const context = await makeContext(VIEWPORTS[0]);
  const page = await context.newPage();
  const urls = new Set();
  for (const screen of SCREENS) {
    await page.goto(`${base}/th/st/2/1${QUERY[screen]}`, { waitUntil: "load" });
    const found = await page.evaluate(async () => {
      const out = [];
      for (const sheet of [...document.styleSheets]) {
        if (!sheet.href) continue;
        const text = await (await fetch(sheet.href)).text();
        for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
          if (match[1].startsWith("data:")) continue;
          out.push(new URL(match[1], sheet.href).href);
        }
      }
      return out;
    });
    for (const url of found) urls.add(url);
  }
  const TYPES = { webp: /^image\/webp/, svg: /^image\/svg\+xml/, woff2: /^(font\/woff2|application\/font-woff2|application\/octet-stream)/ };
  const counts = { webp: 0, svg: 0, woff2: 0 };
  const webpUrls = [];
  let bad = 0;
  for (const url of urls) {
    const extension = (/\.(webp|svg|woff2)(\?|$)/.exec(url) ?? [])[1];
    if (!extension) continue;
    const answer = await page.request.get(url);
    const type = answer.headers()["content-type"] ?? "";
    if (answer.status() === 200 && TYPES[extension].test(type)) counts[extension] += 1; else bad += 1;
    if (extension === "webp") webpUrls.push(url);
  }
  emit("css_urls_found", urls.size);
  row("assets built CSS files", counts.webp === 10 && counts.svg === 4 && counts.woff2 === 2 && bad === 0,
    `webp_files=${counts.webp} svg_files=${counts.svg} woff2_files=${counts.woff2} asset_bad=${bad} urls_checked=${urls.size}`);
  // naturalWidth of each place matches its pin (-p is 1080 wide, -d is 1920 wide).
  let widthBad = 0;
  let widthChecked = 0;
  await page.goto(`${base}/th/st/2/1`, { waitUntil: "load" });
  for (const url of webpUrls) {
    const kind = (/-([pd])[.\w-]*\.webp/.exec(url) ?? [])[1];
    const width = await page.evaluate((src) => new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im.naturalWidth); im.onerror = () => resolve(0); im.src = src; }), url);
    widthChecked += 1;
    if (!kind || width !== PLACE_PINS[kind]) widthBad += 1;
  }
  row("assets place widths", widthChecked === 10 && widthBad === 0, `place_widths_checked=${widthChecked} place_width_bad=${widthBad}`);
  // The edge-glitch check on the 10 files, and the synthetic bad control.
  let edgeMax = 0;
  let edgeFiles = 0;
  for (const url of webpUrls) {
    const delta = await edgeScan(page, url, false);
    edgeFiles += 1;
    edgeMax = Math.max(edgeMax, delta);
  }
  let flagged = 0;
  if (webpUrls.length > 0) {
    const control = await edgeScan(page, webpUrls[0], true);
    flagged = control > EDGE_T ? 1 : 0;
  }
  emit("edge_bad_control_flagged", flagged);
  row("assets edge glitch", edgeVerdict(edgeMax, edgeFiles) && flagged === 1,
    `edge_delta_max=${edgeMax} edge_files=${edgeFiles} edge_threshold=${EDGE_T} edge_bad_control_flagged=${flagged}`);
  await page.close();
  await context.close();
});

// ---- Row 5: reader words. ----
/** Measures the word gaps and the hit height of the words on the open reader page. */
async function measureReader(page) {
  return page.evaluate(() => {
    const elements = [...document.querySelectorAll("[data-word]")];
    function ink(element) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top };
    }
    const words = elements.map((element) => ({ element, rect: ink(element) }));
    const gaps = [];
    for (let index = 0; index + 1 < words.length; index += 1) {
      const a = words[index];
      const b = words[index + 1];
      if (Math.abs(a.rect.top - b.rect.top) > 4) continue;
      let aEnd = a.rect.right;
      const wrapper = b.element.parentElement;
      const leadNode = wrapper ? wrapper.firstChild : null;
      if (leadNode && leadNode.nodeType === Node.TEXT_NODE) {
        const lead = leadNode.textContent ?? "";
        const trailing = /\s+$/.exec(lead);
        const punctuation = trailing ? lead.slice(0, trailing.index) : lead;
        if (punctuation.length > 0) {
          const range = document.createRange();
          range.setStart(leadNode, 0);
          range.setEnd(leadNode, punctuation.length);
          aEnd = range.getBoundingClientRect().right;
        }
      }
      gaps.push(Math.round((b.rect.left - aEnd) * 100) / 100);
    }
    // The hit height is the vertical run of points over the word centre that answer to the word.
    let hitMin = 9999;
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.top < 0 || rect.bottom > window.innerHeight) continue;
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const answers = (py) => { const hit = document.elementFromPoint(x, py); return hit !== null && hit.closest("[data-word]") === element; };
      let up = 0;
      while (up < 40 && answers(y - up - 1)) up += 1;
      let down = 0;
      while (down < 40 && answers(y + down + 1)) down += 1;
      hitMin = Math.min(hitMin, up + down + 1);
    }
    return { gaps, words: words.length, hitMin: hitMin === 9999 ? 0 : hitMin };
  });
}
await guarded("row 5 reader words", async () => {
  let pages = 0;
  let gapMaxDelta = 0;
  let hitMin = 9999;
  for (const vp of VIEWPORTS) {
    const context = await makeContext(vp);
    for (const locale of LOCALES) {
      const page = await context.newPage();
      await page.goto(`${base}/${locale}/st/2/1?part=book`, { waitUntil: "load" });
      await page.waitForSelector("[data-word]", { timeout: 20000 }).catch(() => {});
      await settle(page);
      for (let turn = 0; turn < 2; turn += 1) {
        const measured = await measureReader(page);
        pages += 1;
        if (measured.gaps.length > 0) gapMaxDelta = Math.max(gapMaxDelta, Math.max(...measured.gaps) - Math.min(...measured.gaps));
        if (measured.hitMin > 0) hitMin = Math.min(hitMin, measured.hitMin);
        if (turn === 0) {
          await page.click('button:has-text("→")').catch(() => {});
          await page.waitForTimeout(400);
        }
      }
      await page.close();
    }
    await context.close();
  }
  const delta = Math.round(gapMaxDelta * 10) / 10;
  row("reader gaps", pages === 12 && delta <= 2, `reader_pages_measured=${pages} gap_max_delta_px=${delta}`);
  row("reader hit area", hitMin !== 9999 && hitMin >= 48, `word_hit_h_px_min=${hitMin === 9999 ? 0 : hitMin}`);
  // The touch marker of a clip word (no hover) and the absence of a marker on a no-clip word.
  const context = await makeContext(VIEWPORTS[0]);
  const page = await context.newPage();
  await page.goto(`${base}/en/st/2/1?part=book`, { waitUntil: "load" });
  await page.waitForSelector("[data-word]", { timeout: 20000 }).catch(() => {});
  await settle(page);
  await page.mouse.move(0, 0);
  const marker = await page.evaluate(() => {
    const mark = (el) => { const cs = getComputedStyle(el); return cs.textDecorationLine.includes("underline") || parseFloat(cs.borderBottomWidth) > 0; };
    const words = [...document.querySelectorAll("[data-word]")];
    const clip = words.filter((el) => el.hasAttribute("tabindex"));
    const none = words.filter((el) => !el.hasAttribute("tabindex"));
    return { clip: clip.length, clipMarked: clip.filter(mark).length, none: none.length, noneMarked: none.filter(mark).length };
  });
  row("reader clip marker", marker.clip > 0 && marker.none > 0 && marker.clipMarked === marker.clip && marker.noneMarked === 0,
    `clip_words=${marker.clip} clip_words_marked=${marker.clipMarked} no_clip_words=${marker.none} no_clip_words_marked=${marker.noneMarked}`);
  await page.close();
  await context.close();
});

// ---- Row 6: plain text, computed. ----
await guarded("row 6 plain text", async () => {
  const context = await makeContext(VIEWPORTS[0], { reducedMotion: "no-preference" });
  const props = { textShadow: "none", textTransform: "none", letterSpacing: "normal", filter: "none", transform: "none", animationName: "none" };
  let checked = 0;
  let violations = 0;
  let first = "";
  let lyricImages = -1;
  for (const screen of ["reader", "decodable", "song"]) {
    const page = await context.newPage();
    await openScreen(page, "en", screen);
    const sel = { reader: "[data-sentence], [data-sentence] *, [data-word]", decodable: "section[data-page-number] p, section[data-page-number] p *, section[aria-label='Tricky words'] button", song: "li[data-line-index] span[lang]" }[screen];
    const found = await page.evaluate(({ selector, expected }) => {
      const out = { checked: 0, bad: [], images: document.querySelectorAll("ol li img").length };
      for (const el of document.querySelectorAll(selector)) {
        out.checked += 1;
        const cs = getComputedStyle(el);
        for (const [key, want] of Object.entries(expected)) {
          if (cs[key] !== want) out.bad.push(`${key}=${cs[key]}`);
        }
      }
      return out;
    }, { selector: sel, expected: props });
    checked += found.checked;
    violations += found.bad.length;
    if (!first && found.bad.length > 0) first = `${screen}:${found.bad[0]}`;
    if (screen === "song") lyricImages = found.images;
    await page.close();
  }
  await context.close();
  row("plain text computed", checked > 0 && violations === 0 && lyricImages === 0,
    `elements_checked=${checked} plain_text_violations=${violations} lyric_images=${lyricImages}${first ? ` first=${first}` : ""}`);
});

// ---- Row 7: reduced motion. ----
await guarded("row 7 reduced motion", async () => {
  const reduced = await makeContext(VIEWPORTS[0], { reducedMotion: "reduce" });
  let checked = 0;
  let violations = 0;
  let first = "";
  for (const screen of SCREENS) {
    const page = await reduced.newPage();
    await openScreen(page, "en", screen);
    const found = await page.evaluate(() => {
      const out = { checked: 0, bad: [] };
      for (const el of document.querySelectorAll("*")) {
        out.checked += 1;
        const cs = getComputedStyle(el);
        const durations = cs.transitionDuration.split(",").map((text) => parseFloat(text));
        if (cs.animationName !== "none" || !durations.every((value) => value === 0)) out.bad.push(`${el.tagName.toLowerCase()} animation=${cs.animationName} transition=${cs.transitionDuration}`);
      }
      return out;
    });
    checked += found.checked;
    violations += found.bad.length;
    if (!first && found.bad.length > 0) first = found.bad[0];
    await page.close();
  }
  await reduced.close();
  const normal = await makeContext(VIEWPORTS[0], { reducedMotion: "no-preference" });
  const page = await normal.newPage();
  await openScreen(page, "en", "week");
  const control = await page.evaluate(() => {
    const crest = document.querySelector("[data-crest]");
    return crest ? getComputedStyle(crest).animationName : "none";
  });
  await page.close();
  await normal.close();
  const positive = control !== "none" ? 1 : 0;
  emit("motion_positive_control", positive);
  row("reduced motion", checked > 0 && violations === 0 && positive === 1,
    `elements_checked=${checked} motion_violations=${violations} motion_positive_control=${positive}${first ? ` first=${JSON.stringify(first)}` : ""}`);
});

// ---- Row 8: other pages under the shared global CSS. ----
/** Opens one page, runs the row 1 checks, and prints a row named by its group. */
async function otherPage(group, label, vp, signedIn, locale, path, extra) {
  const context = await makeContext(vp, { signedIn });
  const page = await context.newPage();
  const state = watch(page, group === "not_found" ? `${base}/${locale}${path}` : "");
  let detail = "";
  let ok = false;
  try {
    const response = await page.goto(`${base}/${locale}${path}`, { waitUntil: "load" });
    await settle(page);
    const counts = await checkCounts(page, state);
    totalPairs += counts.contrast_pairs;
    const more = extra ? await extra(page) : { ok: true, text: "" };
    const zero = counts.console_errors === 0 && counts.page_overflow === 0 && counts.tap_under_48 === 0 && counts.contrast_fail === 0;
    ok = zero && more.ok;
    detail = `status=${response ? response.status() : 0} console_errors=${counts.console_errors} page_overflow=${counts.page_overflow} tap_under_48=${counts.tap_under_48} contrast_fail=${counts.contrast_fail} contrast_pairs_checked=${counts.contrast_pairs}${more.text ? ` ${more.text}` : ""}${counts.sample ? ` first=${JSON.stringify(counts.sample)}` : ""}`;
  } catch (error) {
    detail = `the page raises an error: ${String(error).slice(0, 120)}`;
  }
  row(`${group} ${label}`, ok, detail);
  await context.close();
}
await guarded("row 8 other pages", async () => {
  const phone = VIEWPORTS[0];
  for (const locale of LOCALES) await otherPage("sign_in", `${locale} 390x844`, phone, false, locale, "/sign-in");
  await otherPage("join", "th 390x844", phone, false, "th", "/join");
  await otherPage("join", "en 390x844", phone, false, "en", "/join");
  // The 404 of a draft week (signed in): the English link goes to /en/st/2/1 (N6).
  await otherPage("not_found", "draft week en 390x844", phone, true, "en", "/st/2/2", async (page) => {
    const href = await page.evaluate(() => { const link = document.querySelector("main a"); return link ? link.getAttribute("href") : ""; });
    return { ok: href === "/en/st/2/1", text: `not_found_link_en=${href}` };
  });
  await otherPage("not_found", "draft week th 390x844", phone, true, "th", "/st/2/2");
  // The 404 of a stranger path.
  await otherPage("not_found", "stranger path th 390x844", phone, true, "th", "/st/4/1");
});

// ---- Row 9: missing place images. ----
await guarded("row 9 missing asset", async () => {
  const context = await makeContext(VIEWPORTS[0]);
  await context.route(/\.webp(\?|$)/, (route) => route.abort());
  let ok = true;
  let contrast = 0;
  let clipped = 0;
  let pairs = 0;
  for (const screen of SCREENS) {
    const page = await context.newPage();
    const state = watch(page);
    await openScreen(page, "th", screen);
    const counts = await checkCounts(page, state);
    contrast += counts.contrast_fail;
    clipped += counts.clipped_text;
    pairs += counts.contrast_pairs;
    await page.close();
  }
  ok = contrast === 0 && clipped === 0 && pairs > 0;
  row("missing asset place images aborted", ok, `contrast_fail=${contrast} clipped_text=${clipped} contrast_pairs_checked=${pairs}`);
  await context.close();
});

// ---- Row 10: the question screen passes the row 1 checks. ----
await guarded("row 10 question", async () => {
  for (const vp of VIEWPORTS) {
    const context = await makeContext(vp);
    for (const locale of LOCALES) {
      const page = await context.newPage();
      const state = watch(page);
      const found = await openQuestion(page, locale);
      const counts = await checkCounts(page, state);
      const first = await firstView(page);
      row(`question ${locale} ${vp.text}`, found && captureVerdict(counts) && first.band > 0,
        `question_screen=${found ? 1 : 0} hero_band_height_px=${first.band} ${countsText(counts)}${counts.sample ? ` first=${JSON.stringify(counts.sample)}` : ""}`);
      await page.close();
    }
    await context.close();
  }
});

row("row count the rows ran", rowsVerdict(rowCount), `row_count=${rowCount}`);
emit("row_count", rowCount);
await browser.close();
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
printf 'name,class,role\nStaff One,staff,family\n' > "$TMP_DIR/accounts/accounts.csv"
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

echo "=== Make the fixture: shipped w01 with word clips, a level 3 week, and a long title week ==="
# The fixture copies the shipped content folder. It adds the clip fixture of M35 (a clip for each
# reader word except "I"), a second published week at level 3 week 5 (its own bar numbers), and a
# 60-character title at level 3 week 6. Shipped files stay untouched.
if node --input-type=module - "$APP/content" "$FIXTURE" <<'NODE'
import fs from "node:fs";
import path from "node:path";
const [source, target] = process.argv.slice(2);
fs.cpSync(source, target, { recursive: true });
const w01 = JSON.parse(fs.readFileSync(path.join(source, "l2", "w01.json"), "utf8"));
// The shipped w01 holds a draft loops part, so the question screen would not show. The fixture copy
// approves it (the phase3 pattern; fixture only, the shipped file stays untouched).
w01.approval.loops = { ...w01.approval.loops, status: "approved", date: "2026-11-05", words: "fixture approval for the browser gate" };
for (const book of w01.books ?? []) {
  if (book.kind !== "readalong" || !book.audio) continue;
  const clips = {};
  for (const sentence of book.audio.sentences ?? []) {
    for (const word of sentence.words ?? []) {
      const key = String(word.word).toLowerCase();
      if (key !== "i") clips[key] = `audio/words/${key}.mp3`;
    }
  }
  book.audio.wordClips = clips;
}
fs.writeFileSync(path.join(target, "l2", "w01.json"), JSON.stringify(w01));
const longTitle = "Pip and Nan Walk Across the Whole Green Hill Today".padEnd(60, "!");
for (const [week, title] of [[5, "Second Week"], [6, longTitle]]) {
  const copy = structuredClone(w01);
  copy.meta.level = 3;
  copy.meta.week = week;
  copy.meta.key = `st3/${week}`;
  copy.meta.title = title;
  fs.mkdirSync(path.join(target, "l3"), { recursive: true });
  fs.writeFileSync(path.join(target, "l3", `w${String(week).padStart(2, "0")}.json`), JSON.stringify(copy));
}
NODE
then pass "The fixture content folder is made"; else fail "The fixture content folder is not made"; fi

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
    response.writeHead(403, { "content-type": "text/plain" });
    response.end("forbidden");
    return;
  }
  const key = decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(/^[^/]+\//, "");
  const file = path.join(root, key);
  if (!file.startsWith(root) || !fs.existsSync(file)) {
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
    response.writeHead(206, headers);
    fs.createReadStream(file, { start, end }).pipe(response);
    return;
  }
  headers["content-length"] = String(size);
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
if [ ! -d "$APP/public" ]; then
  echo "public_dir=absent"; pass "The app has no public/ folder (public_dir=absent, M30)"
else
  echo "public_dir=present"; fail "The app has a public/ folder, which the Docker image does not copy (public_dir=present, M30)"
fi

echo "=== Start next start on a free port in its own process group ==="
APP_PORT="$(free_port)"
setsid bash -c "echo \$\$ > '$TMP_DIR/server.pid'; cd '$APP' && STORYTIME_CONTENT_DIR='$FIXTURE' STORYTIME_DATABASE_URL='$DB_URL' \
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

echo "=== Run the rows 1 to 11 with SYSTEM Chrome ==="
write_playwright
if (cd "$APP" && GATE_SCREENS="${SCREENS[*]}" GATE_VIEWPORTS="${VIEWPORTS[*]}" GATE_LOCALES="${LOCALES[*]}" \
  node "$PLAYWRIGHT" "http://localhost:$APP_PORT" "$TMP_DIR/accounts/sign-in-cards.csv" "$FIXTURE" >"$TMP_DIR/playwright.log" 2>&1); then
  :
fi
cat "$TMP_DIR/playwright.log"
if grep -qE '^FAIL: ' "$TMP_DIR/playwright.log"; then FAILED=1; fi
while IFS= read -r line; do RESULTS+=("$line"); done < <(grep -E '^(PASS|FAIL): ' "$TMP_DIR/playwright.log")
LOG_PASS=$(grep -cE '^PASS: ' "$TMP_DIR/playwright.log" || true)
LOG_FAIL=$(grep -cE '^FAIL: ' "$TMP_DIR/playwright.log" || true)
PASS_COUNT=$((PASS_COUNT + LOG_PASS))
FAIL_COUNT=$((FAIL_COUNT + LOG_FAIL))
ROWS=$((LOG_PASS + LOG_FAIL))
# A4: a run with no browser row is not a pass.
if [ "$ROWS" -gt 0 ]; then
  pass "The browser rows ran (rows=$ROWS)"
else
  fail "The browser rows did not run (rows=0)"
fi
CAPTURE_ROWS=$(grep -cE '^(PASS|FAIL): capture ' "$TMP_DIR/playwright.log" || true)
echo "capture_rows=$CAPTURE_ROWS"
if [ "$CAPTURE_ROWS" -ne "$CAPTURES" ]; then fail "The capture rows must be $CAPTURES, counted $CAPTURE_ROWS (capture_rows=$CAPTURE_ROWS)"; fi
for name in "${EXTRA_ROWS[@]}"; do
  EXTRA_COUNT=$(grep -cE "^(PASS|FAIL): (hero )?${name} " "$TMP_DIR/playwright.log" || true)
  echo "extra_row_${name}=$EXTRA_COUNT"
  if [ "$EXTRA_COUNT" -lt 1 ]; then fail "The extra row ${name} did not run (extra_row_${name}=0)"; fi
done

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
