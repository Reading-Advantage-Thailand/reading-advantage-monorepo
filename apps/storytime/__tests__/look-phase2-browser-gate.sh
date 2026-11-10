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
#   3 frame       the game bar shows the route level and week; the plaque holds the week title;
#                 a 60-character title stays inside the plaque (Range text box against the plaque
#                 box, plaque_overflow_px=0, clipped_text=0) at 390x844, 568x320, and 844x390, in
#                 English and in Thai (the V1 string).
#   4 assets      every place, SVG, and font that the built CSS requests answers 200 with its type.
#                 look_woff2_files counts only the 2 files of app/look/fonts (Sarabun stays on
#                 next/font/google, so woff2_files_total is larger); no font host, no remote @import.
#   5 reader      gap_max_delta_px, word_hit_h_px_min, and the touch marker of a clip word.
#   6 plain text  the computed text rules of the sentence, the words, the chips, and the lyrics.
#   7 motion      under reduce every element has animation-name none and no running transition
#                 (transition-property none, or a total duration of 0 s); the positive control runs.
#   8 other       sign_in, join, and not_found under the shared global CSS.
#   9 missing     with the place images aborted, the text stays readable.
#  10 question    the question screen shows the same hero band and passes the row 1 checks.
#  11 self-test   the verdict functions reject the broken copies (captures, heights, colours,
#                 overlap, language, spacing, the fixed-height plaque), and no rows.
#  12 council     the round 1 fix batch (task 2.3e): the reader mode buttons are opaque cream with
#                 a navy label at 4.5:1 or more, the HUD label sits off the progress track at 14 px
#                 in the interface language (hud_overlap_px=0), and the sentence spacing holds
#                 (double_space_runs=0, space_before_punct=0), in en and th.
#  13 council r2  the round 2 fix batch (task 2.3f): done_marks_found=0 before a part and >= 1
#                 after the decodable reaches its last page; active_line_before_play=0 and the
#                 active line follows the media clock (the gate moves currentTime to line 2 at
#                 15.14 s and fires timeupdate, the method of Q33; it plays no recording); each
#                 action chip is 16 px or more, opaque, navy, at 4.5:1 or more; the decodable
#                 and reader word gap is 0.25em or more with space_before_punct=0, in en and th.
#
#  15 brand chrome  the five screens in en and th at 390x844: game_bars=0, progressbars=0,
#                 band_icons=0, crest_elems=0, logo_elems=1, logo_name_ok=1,
#                 level_week_copies=1, label_hidden=0 (AC-4.1 to AC-4.3).
#  16 brand tones   the chrome elements of the look screens: the four families, the brand pairs
#                 (white on brown, brown on amber), chrome_contrast_min of 4.5 or more, and
#                 chrome_blue_computed=0 (AC-4.4 and AC-4.5).
#  17 brand banner  the title plaque at 390x844 in en and th: text_align=center, the text box
#                 centered within 2 px at the top and at the bottom, banner_ratio of title_font_px
#                 over banner_h_px from 0.76 to 0.84, clipped_text=0, page_overflow=0 (AC-4.6).
#  18 brand pages   the teacher week, the teacher day, the 403 page, the 404 view, the /st
#                 fallback, the sign-in page, and the join page: console_errors=0,
#                 tap_under_48=0, page_overflow=0, chrome_contrast_min of 4.5 or more, and
#                 chrome_brand_pairs of 1 or more (decision 1).
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
const TEACHER_USER = "teacher-01";
// The 60-character Thai title of adversarial case V1 (look-adversarial-p2.test.tsx). Row 3 sets it
// into the plaque of the fixture week, because one content week holds one title.
const THAI_LONG_TITLE = "สัปดาห์ที่ยาวและยาวที่สุดในโรงเรื่องของเราทั้งหมดในโลกใบนี้ๆ";
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
/** The verdict of the font count: both look fonts are served, and the total never falls below them. */
function fontVerdict(lookFiles, total) { return lookFiles === 2 && total >= lookFiles; }
/** True when an element still moves under reduce: a running animation, or a transition that can run. */
function motionOffender(animationName, transitionProperty, transitionDuration) {
  if (animationName.trim() !== "none") return true;
  if (transitionProperty.trim() === "none") return false;
  return !transitionDuration.split(",").map((text) => parseFloat(text)).every((value) => value === 0);
}

/** Parses a computed CSS colour into channels, or returns null for any other value. */
function parseCssColor(value) {
  const text = String(value).trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1];
    const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: 1 };
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
  if (!rgb) return null;
  const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
}

/** The relative luminance of a colour (WCAG 2.x). */
function relativeLuminance(color) {
  const channel = (value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** The WCAG contrast ratio of two colours. */
function contrastOf(one, two) {
  const high = Math.max(relativeLuminance(one), relativeLuminance(two));
  const low = Math.min(relativeLuminance(one), relativeLuminance(two));
  return (high + 0.05) / (low + 0.05);
}

/** True when the colour reads as navy: blue dominates, and the colour is dark. */
function isNavyColor(color) {
  return color.b > color.r + 20 && color.b > color.g && color.b >= 40 && color.r <= 80 && color.g <= 80;
}

/** True when the colour reads as cream: light, warm, and not pure white. */
function isCreamColor(color) {
  return color.r >= 240 && color.g >= 220 && color.b <= 240 && color.r >= color.g && color.g >= color.b && relativeLuminance(color) >= 0.7;
}

/** The verdict of one mode button: opaque cream, a navy label, and 4.5:1 or more. */
function modeButtonVerdict(background, label) {
  const bg = parseCssColor(background);
  const fg = parseCssColor(label);
  if (!bg || !fg) return false;
  if (bg.a !== 1) return false;
  if (!isCreamColor(bg) || !isNavyColor(fg)) return false;
  return contrastOf(bg, fg) >= 4.5;
}

/** The verdict of the HUD: no overlap of the two boxes, 14 px or more, and the locale text. */
function hudVerdict(overlapPx, fontPx, text, locale) {
  const expected = locale === "en" ? "Level 2 · Week 1" : "ระดับ 2 · สัปดาห์ 1";
  return overlapPx === 0 && Number.isFinite(fontPx) && fontPx >= 14 && text === expected;
}

/** The verdict of the sentence spacing: no visible double space and no space before punctuation. */
function spacingVerdict(doubleRuns, beforePunct) {
  return doubleRuns === 0 && beforePunct === 0;
}

/** The verdict of the done marks: none before a part, at least one after one part. */
function doneMarkVerdict(before, after) {
  return before === 0 && after >= 1;
}

/** The verdict of the lyric line: no line before playback, and the expected index after its start. */
function lyricVerdict(beforeCount, afterIndex, expected) {
  return beforeCount === 0 && afterIndex === expected;
}

/** The verdict of one action chip: 16 px or more, opaque, navy, and 4.5:1 or more. */
function chipVerdict(fontPx, background, label) {
  const bg = parseCssColor(background);
  const fg = parseCssColor(label);
  if (!Number.isFinite(fontPx) || fontPx < 16) return false;
  if (!bg || !fg) return false;
  if (bg.a !== 1) return false;
  if (!isNavyColor(fg)) return false;
  return contrastOf(bg, fg) >= 4.5;
}

/** The verdict of the word gap: 0.25em or more, and no space before punctuation. */
function wordGapVerdict(gapEm, beforePunct) {
  return Number.isFinite(gapEm) && gapEm >= 0.25 && beforePunct === 0;
}

/** The verdict of the default song view: no active row and no filled row before playback. */
function defaultSongVerdict(activeRows, filledRows) {
  return activeRows === 0 && filledRows === 0;
}

/** The verdict of the done badge: 32 x 32 px, #F5B82E, a navy check, and the locale label. */
function badgeVerdict(width, height, background, check, name, locale) {
  const bg = parseCssColor(background);
  const fg = parseCssColor(check);
  const expected = locale === "en" ? "Done" : "เสร็จแล้ว";
  if (bg === null || fg === null) return false;
  if (bg.r !== 245 || bg.g !== 184 || bg.b !== 46) return false;
  if (!isNavyColor(fg)) return false;
  if (Math.round(width) !== 32 || Math.round(height) !== 32) return false;
  return typeof name === "string" && name.trim() === expected;
}

/** The verdict of the pressed sound button: aria-pressed is true, and the fill differs from idle. */
function pressedVerdict(pressedAttr, idleFill, pressedFill) {
  const idle = parseCssColor(idleFill);
  const pressed = parseCssColor(pressedFill);
  if (pressedAttr !== "true") return false;
  if (idle === null || pressed === null) return false;
  return idle.r !== pressed.r || idle.g !== pressed.g || idle.b !== pressed.b || idle.a !== pressed.a;
}

/** The verdict of one dashed frame: 12 CSS px or more from the dashed line to the content. */
function framePadVerdict(paddingSides, insetPx) {
  if (!Array.isArray(paddingSides) || paddingSides.length !== 4) return false;
  if (!Number.isFinite(insetPx)) return false;
  return Math.min(...paddingSides) - insetPx >= 12;
}

/** The verdict of the reader page counter: a cream pill, a navy label, and 4.5:1 or more. */
function counterVerdict(background, label) {
  const bg = parseCssColor(background);
  const fg = parseCssColor(label);
  if (bg === null || fg === null) return false;
  if (bg.a !== 1) return false;
  if (!isCreamColor(bg) || !isNavyColor(fg)) return false;
  return contrastOf(bg, fg) >= 4.5;
}

/** The verdict of the parent panel: no native duration text before the clip loads. */
function nativeDurationVerdict(durationTexts, nativeControls) {
  return durationTexts === 0 && nativeControls === 0;
}

/**
 * The overflow of the title text box outside the plaque box, in CSS px, top and bottom.
 * A fixed plaque height keeps scrollHeight equal to clientHeight, so the text box of a Range is
 * the measure (the UX browser review of F1, 2026-11-09).
 */
function plaqueOverflowPx(plaque, text) {
  const over = (high, low) => Math.max(0, high - low);
  return Math.round(Math.max(over(plaque.top, text.top), over(text.bottom, plaque.bottom)));
}

/** The verdict of the plaque: no text leaves the box, and no text is clipped. */
function plaqueFitsVerdict(overflowPx, clippedText) {
  return Number.isFinite(overflowPx) && overflowPx === 0 && clippedText === 0;
}

/** The verdict of the brand chrome of one screen: no game bar, no crest, one logo, one label. */
function brandChromeVerdict(v) {
  return v.game_bars === 0 && v.progressbars === 0 && v.band_icons === 0
    && v.crest_elems === 0 && v.logo_elems === 1 && v.logo_name_ok === 1
    && v.level_week_copies === 1 && v.label_hidden === 0
    && v.logo_title_overlap_px === 0 && v.logo_h_px >= 48;
}
/** The verdict of the chrome tones: brand pairs above 0, no blue chrome, and 4.5:1 or more. */
function brandTonesVerdict(v) {
  if (!(v.chrome_pairs_checked > 0)) return false;
  if (v.chrome_blue_computed !== 0) return false;
  if (!(v.chrome_contrast_min >= 4.5)) return false;
  if (!(v.amber_pairs > 0)) return false;
  if (!(v.brown_pairs > 0)) return false;
  for (const family of v.families || []) {
    if (family.chrome_blue_computed !== 0) return false;
    if (family.pairs > 0 && !(family.contrast_min >= 4.5)) return false;
  }
  return true;
}
/** The verdict of the title plaque: one line, centered on both ways, and about 80 % of the line. */
function brandBannerVerdict(v) {
  return v.text_align === "center" && v.banner_top_gap_px <= 2 && v.banner_bottom_gap_px <= 2
    && v.line_count === 1 && v.per_line_ratio >= 0.76 && v.per_line_ratio <= 0.84
    && v.clipped_text === 0 && v.page_overflow === 0;
}
/** The verdict of the 60-character title: the same ratio per line, no overflow, and a floor font. */
function brandLongTitleVerdict(v) {
  return v.per_line_ratio >= 0.76 && v.per_line_ratio <= 0.84
    && v.plaque_overflow_px === 0 && v.clipped_text === 0 && v.font_px >= 24;
}
/** The verdict of one page of screens 6 to 9: no console error, no small tap, no overflow, one brand pair. */
function brandPagesVerdict(v) {
  return v.console_errors === 0 && v.tap_under_48 === 0 && v.page_overflow === 0
    && v.chrome_contrast_min >= 4.5 && v.chrome_brand_pairs >= 1;
}
const goodBrandChrome = {
  game_bars: 0, progressbars: 0, band_icons: 0, crest_elems: 0,
  logo_elems: 1, logo_name_ok: 1, level_week_copies: 1, label_hidden: 0,
  logo_title_overlap_px: 0, logo_h_px: 48,
};
const goodBrandTones = {
  families_checked: 4, chrome_pairs_checked: 4, chrome_blue_computed: 0,
  chrome_contrast_min: 4.5, amber_pairs: 2, brown_pairs: 2, families: [],
};
const goodBrandBanner = {
  text_align: "center", banner_top_gap_px: 0, banner_bottom_gap_px: 1,
  line_count: 1, per_line_ratio: 0.8, clipped_text: 0, page_overflow: 0,
};
const goodBrandLongTitle = {
  per_line_ratio: 0.8, plaque_overflow_px: 0, clipped_text: 0, font_px: 24,
};
const goodBrandPages = {
  console_errors: 0, tap_under_48: 0, page_overflow: 0,
  chrome_contrast_min: 4.5, chrome_brand_pairs: 1,
};
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
  fontVerdict(0, 8) === false,
  fontVerdict(1, 9) === false,
  motionOffender("crest-bob", "none", "0s") === true,
  motionOffender("none", "all", "0.15s") === true,
  motionOffender("none", "opacity, color", "0s, 0.2s") === true,
  modeButtonVerdict("rgba(255, 248, 225, 0.5)", "rgb(11, 42, 107)") === false,
  modeButtonVerdict("rgb(255, 248, 225)", "rgb(239, 230, 200)") === false,
  modeButtonVerdict("rgb(51, 51, 51)", "rgb(255, 255, 255)") === false,
  modeButtonVerdict("transparent", "rgb(11, 42, 107)") === false,
  hudVerdict(4, 14, "Level 2 · Week 1", "en") === false,
  hudVerdict(0, 12, "Level 2 · Week 1", "en") === false,
  hudVerdict(0, 14, "ระดับ 2 · สัปดาห์ 1", "en") === false,
  hudVerdict(0, 14, "Level 2 · Week 1", "th") === false,
  spacingVerdict(1, 0) === false,
  spacingVerdict(0, 1) === false,
  doneMarkVerdict(1, 1) === false,
  doneMarkVerdict(0, 0) === false,
  lyricVerdict(1, 1, 1) === false,
  lyricVerdict(0, 0, 1) === false,
  chipVerdict(14, "rgb(255, 248, 225)", "rgb(11, 42, 107)") === false,
  chipVerdict(16, "rgba(255, 248, 225, 0.6)", "rgb(11, 42, 107)") === false,
  chipVerdict(16, "rgb(255, 248, 225)", "rgb(239, 230, 200)") === false,
  wordGapVerdict(0.2, 0) === false,
  wordGapVerdict(0.3, 1) === false,
  defaultSongVerdict(1, 0) === false,
  defaultSongVerdict(0, 1) === false,
  badgeVerdict(30, 32, "rgb(245, 184, 46)", "rgb(19, 36, 78)", "Done", "en") === false,
  badgeVerdict(32, 32, "rgb(245, 185, 50)", "rgb(19, 36, 78)", "Done", "en") === false,
  badgeVerdict(32, 32, "rgb(245, 184, 46)", "rgb(255, 250, 240)", "Done", "en") === false,
  badgeVerdict(32, 32, "rgb(245, 184, 46)", "rgb(19, 36, 78)", "Done", "th") === false,
  pressedVerdict("false", "rgb(224, 156, 28)", "rgb(255, 231, 161)") === false,
  pressedVerdict("true", "rgb(224, 156, 28)", "rgb(224, 156, 28)") === false,
  framePadVerdict([18, 18, 18, 18], 7) === false,
  framePadVerdict([19, 19, 19, 19], 8) === false,
  counterVerdict("rgb(255, 255, 255)", "rgb(19, 36, 78)") === false,
  counterVerdict("rgb(255, 250, 240)", "rgb(255, 255, 255)") === false,
  counterVerdict("rgba(255, 250, 240, 0.5)", "rgb(19, 36, 78)") === false,
  nativeDurationVerdict(1, 0) === false,
  nativeDurationVerdict(0, 1) === false,
  // A fixed-height plaque fixture (40 px) cannot hold the wrapped text box: the text sits above it.
  plaqueFitsVerdict(plaqueOverflowPx({ top: 100, bottom: 140 }, { top: 80, bottom: 140 }), 0) === false,
  plaqueFitsVerdict(plaqueOverflowPx({ top: 100, bottom: 140 }, { top: 100, bottom: 160 }), 0) === false,
  plaqueFitsVerdict(0, 1) === false,
  plaqueFitsVerdict(Number.NaN, 0) === false,
  // The brand rows: a game bar, a hidden label, a 0.70 ratio, a 4.4:1 pair, a blue pair, and an
  // empty brand row.
  brandChromeVerdict({ ...goodBrandChrome, game_bars: 1 }) === false,
  brandChromeVerdict({ ...goodBrandChrome, label_hidden: 1 }) === false,
  brandChromeVerdict({ ...goodBrandChrome, logo_title_overlap_px: 4 }) === false,
  brandBannerVerdict({ ...goodBrandBanner, line_count: 2 }) === false,
  brandBannerVerdict({ ...goodBrandBanner, per_line_ratio: 0.70 }) === false,
  brandTonesVerdict({ ...goodBrandTones, chrome_contrast_min: 4.4 }) === false,
  brandTonesVerdict({ ...goodBrandTones, chrome_blue_computed: 1 }) === false,
  brandPagesVerdict({ ...goodBrandPages, chrome_brand_pairs: 0 }) === false,
  brandLongTitleVerdict({ ...goodBrandLongTitle, font_px: 20 }) === false,
];
const controls = [
  countVerdict(24), pinVerdict(96, 92, 100), pinVerdict(230, 220, 240), pinVerdict(120, 116, 124),
  rowsVerdict(3), captureVerdict(goodCapture), edgeVerdict(10, 10),
  fontVerdict(2, 10), fontVerdict(2, 2),
  motionOffender("none", "none", "0.15s") === false,
  motionOffender("none", "all", "0s") === false,
  motionOffender("none", "opacity, color", "0s, 0s") === false,
  modeButtonVerdict("rgb(255, 248, 225)", "rgb(11, 42, 107)") === true,
  modeButtonVerdict("rgba(255, 248, 225, 1)", "#0b2a6b") === true,
  hudVerdict(0, 14, "Level 2 · Week 1", "en") === true,
  hudVerdict(0, 14.5, "ระดับ 2 · สัปดาห์ 1", "th") === true,
  spacingVerdict(0, 0) === true,
  doneMarkVerdict(0, 1) === true,
  doneMarkVerdict(0, 3) === true,
  lyricVerdict(0, 1, 1) === true,
  chipVerdict(16, "rgb(255, 248, 225)", "rgb(11, 42, 107)") === true,
  chipVerdict(16.5, "rgba(255, 248, 225, 1)", "#0b2a6b") === true,
  wordGapVerdict(0.25, 0) === true,
  wordGapVerdict(0.3, 0) === true,
  defaultSongVerdict(0, 0),
  badgeVerdict(32, 32, "rgb(245, 184, 46)", "rgb(19, 36, 78)", "Done", "en"),
  badgeVerdict(32, 32, "#f5b82e", "#13244e", "เสร็จแล้ว", "th"),
  pressedVerdict("true", "rgb(224, 156, 28)", "rgb(255, 231, 161)"),
  framePadVerdict([19, 19, 19, 19], 7),
  counterVerdict("rgb(255, 250, 240)", "rgb(19, 36, 78)"),
  nativeDurationVerdict(0, 0),
  // The control: the same plaque box holds a text box inside it, and the V1 Thai title holds 60.
  plaqueFitsVerdict(plaqueOverflowPx({ top: 100, bottom: 140 }, { top: 108, bottom: 132 }), 0),
  plaqueFitsVerdict(plaqueOverflowPx({ top: 100, bottom: 140 }, { top: 100, bottom: 140 }), 0),
  THAI_LONG_TITLE.trim().length === 60,
  brandChromeVerdict(goodBrandChrome),
  brandTonesVerdict(goodBrandTones),
  brandBannerVerdict(goodBrandBanner),
  brandLongTitleVerdict(goodBrandLongTitle),
  brandPagesVerdict(goodBrandPages),
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

/** Reads the password of one account from the card list of the fixture. */
function passwordFor(user) {
  for (const line of fs.readFileSync(cardsPath, "utf8").trim().split("\n").slice(1)) {
    const parts = line.split(",");
    if (parts[0] === user) return parts[parts.length - 1].replace(/\r$/, "");
  }
  return "";
}
const PASS = passwordFor(USER);
const TEACHER_PASS = passwordFor(TEACHER_USER);
if (!PASS) {
  console.log(`FAIL: card list the temp card list holds no ${USER}`);
  process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome" });
let cookies = [];
let teacherCookies = [];

/** Signs in once through the page and keeps the session cookies for later contexts. */
/** Signs one account in and returns the cookies of its session. */
async function signIn(user, password) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${base}/th/sign-in?next=${encodeURIComponent("/th/st/2/1")}`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', user);
  await page.fill('input[name="password"]', password);
  const answer = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/api/auth/sign-in"),
    { timeout: 20000 },
  );
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/sign-in"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await answer;
  const signed = await context.cookies();
  await context.close();
  return signed;
}

/** Signs the family account in and keeps its cookies. */
async function signInOnce() {
  cookies = await signIn(USER, PASS);
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
  const session = options.session ?? "family";
  if (session === "family") await context.addCookies(cookies);
  if (session === "teacher") await context.addCookies(teacherCookies);
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

/** The number of lyric lines of the fixture song. */
const shippedLines = (() => {
  try {
    const week = JSON.parse(fs.readFileSync(`${fixtureDir}/l2/w01.json`, "utf8"));
    return (week.song?.lines ?? []).length;
  } catch { return 0; }
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
  let beforePlay = null;
  if (screen === "song") beforePlay = await readDefaultSong(page);
  let activeLine = -1;
  if (screen === "song") activeLine = await activateLine(page, 1).catch(() => -1);
  await settle(page);
  return { activeLine, beforePlay };
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
          const defaultOk = screen !== "song" || (opened.beforePlay !== null && defaultSongVerdict(opened.beforePlay.active, opened.beforePlay.filled));
          ok = captureVerdict(counts) && signedIn && (screen !== "song" || opened.activeLine === 1) && defaultOk;
          detail = `${countsText(counts)}${screen === "song" ? ` active_line_index=${opened.activeLine} active_line_before_play=${opened.beforePlay ? opened.beforePlay.active : -1} filled_rows_before_play=${opened.beforePlay ? opened.beforePlay.filled : -1}` : ""}${counts.sample ? ` first=${JSON.stringify(counts.sample)}` : ""}`;
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
/** Reads the chrome of the frame: the game bar, the crest, the logo, the label words, and the plaque. */
async function readFrame(page) {
  return page.evaluate(() => {
    const label = document.querySelector("[data-level-week]");
    const logo = document.querySelector("[data-logo]");
    const title = document.querySelector("main h1");
    return {
      bars: document.querySelectorAll("[data-game-bar]").length,
      crests: document.querySelectorAll("[data-crest]").length,
      logos: document.querySelectorAll("[data-logo]").length,
      logoName: logo && logo.tagName.toLowerCase() === "img" ? (logo.getAttribute("alt") ?? "") : "",
      labelText: label ? (label.textContent ?? "").trim() : "",
      numbers: label ? (label.textContent ?? "").match(/\d+/g) ?? [] : [],
      title: title ? (title.textContent ?? "").trim() : "",
    };
  });
}

/**
 * Measures the plaque of the open page: the title text box of a Range against the plaque box.
 * The fixed height of the landscape plaque keeps scrollHeight equal to clientHeight, so the
 * scroll measure of row 1 reads 0 and this measure is the one that sees the overflow.
 */
async function measurePlaque(page) {
  const measured = await page.evaluate(() => {
    const node = document.querySelector("header[data-hero] > h1");
    if (!node) return null;
    const range = document.createRange();
    range.selectNodeContents(node);
    const plaque = node.getBoundingClientRect();
    const text = range.getBoundingClientRect();
    return {
      chars: (node.textContent ?? "").trim().length,
      plaque_h_px: Math.round(plaque.height),
      plaque: { top: plaque.top, bottom: plaque.bottom },
      text: { top: text.top, bottom: text.bottom },
    };
  });
  if (measured === null) return { chars: -1, overflow_px: -1, plaque_h_px: -1 };
  return {
    chars: measured.chars,
    overflow_px: plaqueOverflowPx(measured.plaque, measured.text),
    plaque_h_px: measured.plaque_h_px,
  };
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
      frame.bars === 0 && frame.crests === 0 && frame.logos === 1
      && frame.logoName === "Storytime Advantage"
      && frame.numbers[0] === item.level && frame.numbers[1] === item.week
      && frame.title === item.title,
      `game_bars=${frame.bars} crest_elems=${frame.crests} logo_elems=${frame.logos} logo_name=${JSON.stringify(frame.logoName)} label_numbers=${frame.numbers.join(",")} plaque_title=${JSON.stringify(frame.title)}`);
    await page.close();
  }
  await context.close();
  // A 60-character title (adversarial seed) causes no overflow and no clipped text. The English
  // title is the fixture week title. The Thai title is the string of adversarial case V1, set into
  // the plaque of the same route. The measure is the Range text box against the plaque box, top and
  // bottom, because the fixed height of the landscape plaque hides the overflow from scrollHeight.
  const longCases = [];
  for (const viewport of [
    { text: "390x844", width: 390, height: 844, phone: true },
    { text: "568x320", width: 568, height: 320, phone: true },
    { text: "844x390", width: 844, height: 390, phone: true },
  ]) {
    for (const locale of ["en", "th"]) {
      if (viewport.text === "390x844" && locale === "th") continue;
      const longContext = await makeContext(viewport);
      const page = await longContext.newPage();
      const state = watch(page);
      await page.goto(`${base}/${locale}/st/3/6`, { waitUntil: "load" });
      await settle(page);
      if (locale === "th") {
        await page.evaluate((text) => {
          const plaque = document.querySelector("header[data-hero] > h1");
          if (plaque) plaque.textContent = text;
        }, THAI_LONG_TITLE);
        await settle(page);
      }
      const plaque = await measurePlaque(page);
      const counts = await checkCounts(page, state);
      longCases.push({
        label: `${viewport.text}_${locale}`,
        chars: plaque.chars,
        overflow_px: plaque.overflow_px,
        plaque_h_px: plaque.plaque_h_px,
        clipped_text: counts.clipped_text,
        page_overflow: counts.page_overflow,
      });
      await page.close();
      await longContext.close();
    }
  }
  const longOk = longCases.length === 5 && longCases.every((one) =>
    one.chars === 60 && one.page_overflow === 0 && plaqueFitsVerdict(one.overflow_px, one.clipped_text));
  row("frame long title 60 characters", longOk,
    `cases=${longCases.length} `
    + longCases.map((one) => `${one.label} plaque_overflow_px=${one.overflow_px} clipped_text=${one.clipped_text} title_chars=${one.chars} plaque_h_px=${one.plaque_h_px} page_overflow=${one.page_overflow}`).join(" | "));
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
  let remoteImports = 0;
  for (const screen of SCREENS) {
    await page.goto(`${base}/th/st/2/1${QUERY[screen]}`, { waitUntil: "load" });
    const found = await page.evaluate(async () => {
      const out = { urls: [], remoteImports: 0 };
      for (const sheet of [...document.styleSheets]) {
        if (!sheet.href) continue;
        const text = await (await fetch(sheet.href)).text();
        out.remoteImports += [...text.matchAll(/@import\s+(?:url\(\s*)?["']?https?:/g)].length;
        for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
          if (match[1].startsWith("data:")) continue;
          out.urls.push(new URL(match[1], sheet.href).href);
        }
      }
      return out;
    });
    remoteImports += found.remoteImports;
    for (const url of found.urls) urls.add(url);
  }
  const TYPES = { webp: /^image\/webp/, svg: /^image\/svg\+xml/, woff2: /^(font\/woff2|application\/font-woff2|application\/octet-stream)/ };
  const counts = { webp: 0, svg: 0, woff2: 0 };
  // The look fonts are the files of app/look/fonts; next/font/local serves them with their bytes.
  const fontDir = "app/look/fonts";
  const lookFonts = fs.readdirSync(fontDir).filter((name) => name.endsWith(".woff2")).map((name) => ({ name, bytes: fs.readFileSync(`${fontDir}/${name}`) }));
  const lookServed = new Set();
  const origin = new URL(base).origin;
  let remoteFonts = 0;
  const webpUrls = [];
  let bad = 0;
  for (const url of urls) {
    const extension = (/\.(webp|svg|woff2)(\?|$)/.exec(url) ?? [])[1];
    if (!extension) continue;
    const answer = await page.request.get(url);
    const type = answer.headers()["content-type"] ?? "";
    if (answer.status() === 200 && TYPES[extension].test(type)) counts[extension] += 1; else bad += 1;
    if (extension === "webp") webpUrls.push(url);
    if (extension === "woff2") {
      if (new URL(url).origin !== origin) remoteFonts += 1;
      const body = await answer.body();
      for (const font of lookFonts) if (body.equals(font.bytes)) lookServed.add(font.name);
    }
  }
  emit("css_urls_found", urls.size);
  row("assets built CSS files",
    counts.webp === 10 && counts.svg === 4 && fontVerdict(lookServed.size, counts.woff2) && lookFonts.length === 2 && bad === 0 && remoteFonts === 0 && remoteImports === 0,
    `webp_files=${counts.webp} svg_files=${counts.svg} look_woff2_files=${lookServed.size} woff2_files_total=${counts.woff2} look_font_sources=${lookFonts.length} font_remote_urls=${remoteFonts} css_remote_imports=${remoteImports} asset_bad=${bad} urls_checked=${urls.size}`);
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
      // One entry per distinct style triple; Node applies motionOffender, the function of the self-test.
      const out = { checked: 0, groups: {} };
      for (const el of document.querySelectorAll("*")) {
        out.checked += 1;
        const cs = getComputedStyle(el);
        const key = JSON.stringify([cs.animationName, cs.transitionProperty, cs.transitionDuration]);
        const group = out.groups[key] ?? (out.groups[key] = { count: 0, tag: el.tagName.toLowerCase() });
        group.count += 1;
      }
      return out;
    });
    checked += found.checked;
    for (const [key, group] of Object.entries(found.groups)) {
      const [animation, property, duration] = JSON.parse(key);
      if (!motionOffender(animation, property, duration)) continue;
      violations += group.count;
      if (!first) first = `${group.tag} animation=${animation} transition-property=${property} transition-duration=${duration}`;
    }
    await page.close();
  }
  await reduced.close();
  const normal = await makeContext(VIEWPORTS[0], { reducedMotion: "no-preference" });
  const page = await normal.newPage();
  await openScreen(page, "en", "song");
  // The crest is gone in the brand chrome, so the positive control reads the active lyric line,
  // which keeps the sq-glow animation.
  const control = await page.evaluate(() => {
    const line = document.querySelector('[data-part="song"] li[aria-current="true"]');
    return line ? getComputedStyle(line).animationName : "none";
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

// ---- Row 12: the council round 1 fix batch (task 2.3e). ----
/** Reads the reader mode buttons: their computed fill, label, and the stable hook. */
async function readModeButtons(page) {
  return page.evaluate(() => [...document.querySelectorAll("button[aria-pressed]")].map((button) => {
    const style = getComputedStyle(button);
    return {
      text: (button.textContent ?? "").trim(),
      background: style.backgroundColor,
      color: style.color,
      hook: button.hasAttribute("data-mode-button"),
    };
  }));
}

/** Reads the HUD label and the title plaque: their overlap, the font size, and the text. */
async function readHud(page) {
  return page.evaluate(() => {
    const label = document.querySelector("[data-level-week]");
    const plaque = document.querySelector("header[data-hero] > h1");
    if (!label || !plaque) return { text: null, font: 0, overlap: -1 };
    const one = label.getBoundingClientRect();
    const two = plaque.getBoundingClientRect();
    const width = Math.max(0, Math.min(one.right, two.right) - Math.max(one.left, two.left));
    const height = Math.max(0, Math.min(one.bottom, two.bottom) - Math.max(one.top, two.top));
    return {
      text: (label.textContent ?? "").trim(),
      font: parseFloat(getComputedStyle(label).fontSize),
      overlap: Math.round(width * height),
    };
  });
}

/** Counts the visible double spaces and the spaces before punctuation of one sentence element. */
async function readSpacing(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const chars = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const data = node.data ?? "";
      for (let index = 0; index < data.length; index += 1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getBoundingClientRect();
        chars.push({ ch: data[index], left: rect.left, right: rect.right, top: rect.top });
      }
    }
    const letters = chars.filter((char) => char.ch.trim() !== "");
    if (letters.length < 4) return { double: 0, before: 0, chars: letters.length };
    const fontPx = parseFloat(getComputedStyle(root).fontSize) || 16;
    let double = 0;
    let before = 0;
    for (let index = 0; index + 1 < letters.length; index += 1) {
      const a = letters[index];
      const b = letters[index + 1];
      if (Math.abs(a.top - b.top) > 2) continue;
      if (b.left - a.right > fontPx * 0.6) double += 1;
    }
    for (let index = 1; index < letters.length; index += 1) {
      const a = letters[index - 1];
      const b = letters[index];
      if (!/[.,!?]/.test(b.ch) || Math.abs(a.top - b.top) > 2) continue;
      if (b.left - a.right > fontPx * 0.35) before += 1;
    }
    return { double, before, chars: letters.length };
  }, selector);
}

await guarded("row 12 council buttons", async () => {
  let buttons = 0;
  let failures = 0;
  let minContrast = 99;
  let minAlpha = 9;
  let sample = "";
  for (const vp of VIEWPORTS) {
    const context = await makeContext(vp);
    for (const locale of LOCALES) {
      const page = await context.newPage();
      await openScreen(page, locale, "reader");
      const found = await readModeButtons(page);
      const mode = found.filter((button) => button.hook);
      if (mode.length !== 3) {
        failures += 1;
        sample = sample || `${locale} ${vp.text}: mode_buttons=${mode.length}`;
      }
      for (const button of mode) {
        buttons += 1;
        const bg = parseCssColor(button.background);
        const fg = parseCssColor(button.color);
        if (bg) minAlpha = Math.min(minAlpha, bg.a);
        if (bg && fg) minContrast = Math.min(minContrast, contrastOf(bg, fg));
        if (!modeButtonVerdict(button.background, button.color)) {
          failures += 1;
          sample = sample || `${locale} ${vp.text}: ${button.text} bg=${button.background} color=${button.color}`;
        }
      }
      await page.close();
    }
    await context.close();
  }
  const minimum = minContrast === 99 ? 0 : Math.round(minContrast * 100) / 100;
  row("council mode buttons", buttons === 18 && failures === 0,
    `mode_button_pairs=${buttons} mode_button_failures=${failures} mode_button_contrast_min=${minimum} mode_button_alpha_min=${minAlpha === 9 ? 0 : minAlpha}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 12 council hud", async () => {
  let cases = 0;
  let failures = 0;
  let overlapMax = 0;
  let fontMin = 999;
  let sample = "";
  for (const vp of VIEWPORTS) {
    const context = await makeContext(vp);
    for (const locale of LOCALES) {
      const page = await context.newPage();
      await openScreen(page, locale, "week");
      const hud = await readHud(page);
      cases += 1;
      if (hud.text === null) {
        failures += 1;
        sample = sample || `${locale} ${vp.text}: no HUD label or title plaque`;
      } else {
        overlapMax = Math.max(overlapMax, hud.overlap);
        fontMin = Math.min(fontMin, hud.font);
        if (!hudVerdict(hud.overlap, hud.font, hud.text, locale)) {
          failures += 1;
          sample = sample || `${locale} ${vp.text}: text=${JSON.stringify(hud.text)} font=${hud.font} overlap=${hud.overlap}`;
        }
      }
      await page.close();
    }
    await context.close();
  }
  emit("hud_overlap_px", overlapMax);
  row("council hud label", cases === 6 && failures === 0,
    `hud_cases=${cases} hud_failures=${failures} hud_overlap_px=${overlapMax} hud_font_px_min=${fontMin === 999 ? 0 : fontMin}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 12 council spacing", async () => {
  let cases = 0;
  let failures = 0;
  let doubleRuns = 0;
  let beforePunct = 0;
  let sample = "";
  const targets = [
    { screen: "decodable", selector: "[data-page-number] p" },
    { screen: "reader", selector: "[data-sentence]" },
  ];
  for (const vp of [VIEWPORTS[0], VIEWPORTS[1]]) {
    const context = await makeContext(vp);
    for (const locale of LOCALES) {
      for (const target of targets) {
        const page = await context.newPage();
        await openScreen(page, locale, target.screen);
        const found = await readSpacing(page, target.selector);
        cases += 1;
        if (!found || found.chars < 4) {
          failures += 1;
          sample = sample || `${locale} ${vp.text} ${target.screen}: no sentence`;
        } else {
          doubleRuns += found.double;
          beforePunct += found.before;
          if (!spacingVerdict(found.double, found.before)) {
            failures += 1;
            sample = sample || `${locale} ${vp.text} ${target.screen}: double=${found.double} before=${found.before}`;
          }
        }
        await page.close();
      }
    }
    await context.close();
  }
  row("council sentence spacing", cases === 8 && failures === 0,
    `spacing_cases=${cases} spacing_failures=${failures} double_space_runs=${doubleRuns} space_before_punct=${beforePunct}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

// ---- Row 13: the council round 2 fix batch (task 2.3f). ----
/** Counts the visible done marks of the week page. */
async function readDoneMarks(page) {
  return page.evaluate(() => document.querySelectorAll("[data-done-mark]").length);
}

/** Presses Next on the decodable until the last page writes the per-device completion record. */
async function finishDecodable(page, locale) {
  const english = JSON.parse(fs.readFileSync("messages/en.json", "utf8"));
  const thai = JSON.parse(fs.readFileSync("messages/th.json", "utf8"));
  const label = locale === "th" ? thai.decNextPage : english.decNextPage;
  const next = page.getByRole("button", { name: label, exact: true });
  for (let step = 0; step < 12; step += 1) {
    if (await next.isDisabled().catch(() => true)) break;
    await next.click();
  }
}

/** Counts the lyric lines that are active, and returns the index of the active one. */
async function readActiveLine(page) {
  return page.evaluate(() => {
    const active = [...document.querySelectorAll('li[data-line-index][aria-current="true"]')];
    return { count: active.length, index: active.length > 0 ? Number(active[0].getAttribute("data-line-index")) : -1 };
  });
}

/** Reads the default song state: rows with aria-current, and rows that paint their own fill. */
async function readDefaultSong(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll("li[data-line-index]")];
    const filled = rows.filter((row) => {
      const background = getComputedStyle(row).backgroundColor;
      return background !== "rgba(0, 0, 0, 0)" && background !== "transparent";
    }).length;
    const active = rows.filter((row) => row.getAttribute("aria-current") === "true").length;
    return { active, filled };
  });
}

/** Reads the computed style of each action chip. */
async function readActionChips(page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-action-chip]")].map((chip) => {
    const style = getComputedStyle(chip);
    return { font: parseFloat(style.fontSize), background: style.backgroundColor, color: style.color };
  }));
}

/** Reads the gap between the first two word boxes, in em of the sentence root. */
async function readWordGap(page, rootSelector, wordSelector) {
  return page.evaluate(({ rootSelector: rootSel, wordSelector: wordSel }) => {
    const root = document.querySelector(rootSel);
    if (!root) return null;
    const words = [...root.querySelectorAll(wordSel)].filter((element) => (element.textContent ?? "").trim() !== "");
    if (words.length < 2) return null;
    const one = words[0].getBoundingClientRect();
    const two = words[1].getBoundingClientRect();
    const fontPx = parseFloat(getComputedStyle(root).fontSize) || 16;
    return { gapEm: (two.left - one.right) / fontPx };
  }, { rootSelector, wordSelector });
}

await guarded("row 13 council r2 done marks", async () => {
  let cases = 0;
  let failures = 0;
  let beforeMax = 0;
  let afterMin = 99;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    const page = await context.newPage();
    await openScreen(page, locale, "week");
    const before = await readDoneMarks(page);
    beforeMax = Math.max(beforeMax, before);
    if (before !== 0) {
      failures += 1;
      sample = sample || `${locale}: done_marks_found=${before} before any part is done`;
    }
    await openScreen(page, locale, "decodable");
    await finishDecodable(page, locale);
    await openScreen(page, locale, "week");
    const after = await readDoneMarks(page);
    afterMin = Math.min(afterMin, after);
    cases += 1;
    if (!doneMarkVerdict(before, after)) {
      failures += 1;
      sample = sample || `${locale}: before=${before} after=${after}`;
    }
    await page.close();
    await context.close();
  }
  emit("done_marks_found_before", beforeMax);
  emit("done_marks_found_after", afterMin === 99 ? 0 : afterMin);
  row("council r2 done marks", cases === 2 && failures === 0,
    `done_mark_cases=${cases} done_mark_failures=${failures} done_marks_found=0 before=${beforeMax} done_marks_found_after=${afterMin === 99 ? 0 : afterMin}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 13 council r2 lyric line", async () => {
  let cases = 0;
  let failures = 0;
  let beforeCount = 0;
  let afterIndex = -1;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    const page = await context.newPage();
    await page.goto(`${base}/${locale}/st/2/1?part=song`, { waitUntil: "load" });
    await page.waitForSelector(".song-stage video, .song-stage audio", { timeout: 20000 });
    const before = await readActiveLine(page);
    beforeCount = Math.max(beforeCount, before.count);
    const after = await activateLine(page, 1);
    afterIndex = cases === 0 ? after : Math.min(afterIndex, after);
    cases += 1;
    if (!lyricVerdict(before.count, after, 1)) {
      failures += 1;
      sample = sample || `${locale}: before=${before.count} after=${after}`;
    }
    await page.close();
    await context.close();
  }
  emit("active_line_before_play", beforeCount);
  row("council r2 lyric line", cases === 2 && failures === 0,
    `lyric_cases=${cases} lyric_failures=${failures} active_line_before_play=${beforeCount} active_line_after_play=${afterIndex}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 13 council r2 action chips", async () => {
  let cases = 0;
  let failures = 0;
  let chips = 0;
  let fontMin = 999;
  let alphaMin = 9;
  let contrastMin = 99;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    const page = await context.newPage();
    await openScreen(page, locale, "song");
    const found = await readActionChips(page);
    cases += 1;
    if (found.length !== shippedLines) {
      failures += 1;
      sample = sample || `${locale}: action_chips=${found.length}`;
    }
    for (const chip of found) {
      chips += 1;
      fontMin = Math.min(fontMin, chip.font);
      const bg = parseCssColor(chip.background);
      const fg = parseCssColor(chip.color);
      if (bg) alphaMin = Math.min(alphaMin, bg.a);
      if (bg && fg) contrastMin = Math.min(contrastMin, contrastOf(bg, fg));
      if (!chipVerdict(chip.font, chip.background, chip.color)) {
        failures += 1;
        sample = sample || `${locale}: font=${chip.font} bg=${chip.background} color=${chip.color}`;
      }
    }
    await page.close();
    await context.close();
  }
  emit("action_chips", chips);
  row("council r2 action chips", cases === 2 && failures === 0,
    `action_chip_cases=${cases} action_chip_failures=${failures} action_chips=${chips} chip_font_px_min=${fontMin === 999 ? 0 : fontMin} chip_alpha_min=${alphaMin === 9 ? 0 : alphaMin} chip_contrast_min=${contrastMin === 99 ? 0 : Math.round(contrastMin * 100) / 100}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 13 council r2 word gap", async () => {
  let cases = 0;
  let failures = 0;
  let gapMin = 99;
  let beforePunct = 0;
  let sample = "";
  const targets = [
    { screen: "decodable", root: "[data-page-number] p", word: "button" },
    { screen: "reader", root: "[data-sentence]", word: "[data-word]" },
  ];
  for (const vp of [VIEWPORTS[0], VIEWPORTS[1]]) {
    const context = await makeContext(vp);
    for (const locale of LOCALES) {
      for (const target of targets) {
        const page = await context.newPage();
        await openScreen(page, locale, target.screen);
        const found = await readWordGap(page, target.root, target.word);
        const spacing = await readSpacing(page, target.root);
        cases += 1;
        if (!found) {
          failures += 1;
          sample = sample || `${locale} ${vp.text} ${target.screen}: no two word boxes`;
        } else {
          gapMin = Math.min(gapMin, found.gapEm);
          beforePunct += spacing ? spacing.before : 0;
          if (!wordGapVerdict(found.gapEm, spacing ? spacing.before : 1)) {
            failures += 1;
            sample = sample || `${locale} ${vp.text} ${target.screen}: gap_em=${Math.round(found.gapEm * 1000) / 1000} before=${spacing ? spacing.before : "none"}`;
          }
        }
        await page.close();
      }
    }
    await context.close();
  }
  emit("word_gap_em_min", gapMin === 99 ? 0 : Math.round(gapMin * 1000) / 1000);
  row("council r2 word gap", cases === 8 && failures === 0,
    `word_gap_cases=${cases} word_gap_failures=${failures} word_gap_em_min=${gapMin === 99 ? 0 : Math.round(gapMin * 1000) / 1000} space_before_punct=${beforePunct}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

// ---- Row 14: the council round 3 fix batch (task 2.3g). ----
/** Reads the done badge: its box, its fill, its check colour, its name, and the chevron. */
async function readBadge(page) {
  return page.evaluate(() => {
    const badge = document.querySelector("[data-done-badge]");
    if (!badge) return null;
    const box = badge.getBoundingClientRect();
    const style = getComputedStyle(badge);
    const icon = badge.querySelector("[data-done-icon], svg");
    const link = badge.closest("li") ? badge.closest("li").querySelector("a") : null;
    const after = link ? getComputedStyle(link, "::after") : null;
    return {
      w: box.width,
      h: box.height,
      background: style.backgroundColor,
      check: icon ? getComputedStyle(icon).color : style.color,
      name: (badge.getAttribute("aria-label") ?? badge.textContent ?? "").trim(),
      chevron: after ? after.display !== "none" && after.content !== "none" : true,
    };
  });
}

/** Reads the decodable sound button: its pressed attribute and its computed fill. */
async function readSoundButton(page) {
  return page.evaluate(() => {
    const button = document.querySelector('[data-part="decodable"] > div > section[aria-label] button');
    if (!button) return null;
    return { pressed: button.getAttribute("aria-pressed"), background: getComputedStyle(button).backgroundColor };
  });
}

/** Reads the padding inside each dashed decodable frame, in CSS px per side. */
async function readFrameGaps(page) {
  return page.evaluate(() => {
    const frames = [
      '[data-part="decodable"] > div > section[aria-label]',
      '[data-part="decodable"] div > section[aria-label]:last-child',
    ];
    return frames.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const frame = getComputedStyle(element, "::before");
      const gaps = [
        parseFloat(style.paddingTop) - parseFloat(frame.top),
        parseFloat(style.paddingRight) - parseFloat(frame.right),
        parseFloat(style.paddingBottom) - parseFloat(frame.bottom),
        parseFloat(style.paddingLeft) - parseFloat(frame.left),
      ];
      return { gaps, gap: Math.min(...gaps) };
    });
  });
}

/** Reads the reader page counter: its fill, its label colour, and its text. */
async function readCounter(page) {
  return page.evaluate(() => {
    const element = document.querySelector("[data-page-count]");
    if (!element) return null;
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, text: (element.textContent ?? "").trim() };
  });
}

/** Reads the parent panel: the 0:00 / 0:00 text nodes and the native audio controls. */
async function readParentPanel(page) {
  return page.evaluate(() => {
    const panels = [...document.querySelectorAll("main > section[aria-label]")];
    const panel = panels[panels.length - 1];
    if (!panel) return null;
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    let texts = 0;
    while (walker.nextNode()) {
      if (/0:00\s*\/\s*0:00/.test(walker.currentNode.data ?? "")) texts += 1;
    }
    return { texts, controls: panel.querySelectorAll("audio[controls]").length };
  });
}

await guarded("row 14 council r3 default song", async () => {
  let cases = 0;
  let failures = 0;
  let activeMax = 0;
  let filledMax = 0;
  let sample = "";
  for (const vp of VIEWPORTS) {
    const context = await makeContext(vp);
    for (const locale of LOCALES) {
      const page = await context.newPage();
      await page.goto(`${base}/${locale}/st/2/1?part=song`, { waitUntil: "load" });
      await page.waitForSelector(".song-stage video, .song-stage audio", { timeout: 20000 }).catch(() => {});
      const before = await readDefaultSong(page);
      cases += 1;
      activeMax = Math.max(activeMax, before.active);
      filledMax = Math.max(filledMax, before.filled);
      if (!defaultSongVerdict(before.active, before.filled)) {
        failures += 1;
        sample = sample || `${locale} ${vp.text}: active=${before.active} filled=${before.filled}`;
      }
      await page.close();
    }
    await context.close();
  }
  emit("default_song_active_rows", activeMax);
  emit("default_song_filled_rows", filledMax);
  row("council r3 default song", cases === 6 && failures === 0,
    `default_song_cases=${cases} default_song_failures=${failures} active_line_before_play=${activeMax} filled_rows_before_play=${filledMax}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 14 council r3 done badge", async () => {
  let cases = 0;
  let failures = 0;
  let widthMin = 99;
  let heightMin = 99;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem("storytime:done", JSON.stringify({ "2:1:book": true }));
    });
    await openScreen(page, locale, "week");
    const found = await readBadge(page);
    cases += 1;
    if (!found) {
      failures += 1;
      sample = sample || `${locale}: no [data-done-badge]`;
    } else {
      widthMin = Math.min(widthMin, Math.round(found.w));
      heightMin = Math.min(heightMin, Math.round(found.h));
      if (!badgeVerdict(found.w, found.h, found.background, found.check, found.name, locale) || found.chevron) {
        failures += 1;
        sample = sample || `${locale}: w=${Math.round(found.w)} h=${Math.round(found.h)} bg=${found.background} check=${found.check} name=${JSON.stringify(found.name)} chevron=${found.chevron}`;
      }
    }
    await page.close();
    await context.close();
  }
  emit("done_badge_w_px_min", widthMin === 99 ? 0 : widthMin);
  emit("done_badge_h_px_min", heightMin === 99 ? 0 : heightMin);
  row("council r3 done badge", cases === 2 && failures === 0,
    `done_badge_cases=${cases} done_badge_failures=${failures} done_badge_w_px_min=${widthMin === 99 ? 0 : widthMin} done_badge_h_px_min=${heightMin === 99 ? 0 : heightMin}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 14 council r3 pressed sound", async () => {
  const english = JSON.parse(fs.readFileSync("messages/en.json", "utf8"));
  const thai = JSON.parse(fs.readFileSync("messages/th.json", "utf8"));
  let cases = 0;
  let failures = 0;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    const page = await context.newPage();
    await openScreen(page, locale, "decodable");
    const idle = await readSoundButton(page);
    const label = locale === "th" ? thai.decPlaySound : english.decPlaySound;
    await page.getByRole("button", { name: label, exact: true }).click().catch(() => {});
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-part="decodable"] > div > section[aria-label] button');
      return button !== null && button.getAttribute("aria-pressed") === "true";
    }, undefined, { timeout: 5000 }).catch(() => {});
    const pressed = await readSoundButton(page);
    cases += 1;
    if (!idle || !pressed || !pressedVerdict(pressed.pressed, idle.background, pressed.background)) {
      failures += 1;
      sample = sample || `${locale}: idle=${idle ? idle.background : "none"} pressed=${pressed ? `${pressed.pressed} ${pressed.background}` : "none"}`;
    }
    await page.close();
    await context.close();
  }
  row("council r3 pressed sound", cases === 2 && failures === 0,
    `pressed_sound_cases=${cases} pressed_sound_failures=${failures}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 14 council r3 frame padding", async () => {
  let cases = 0;
  let failures = 0;
  let gapMin = 99;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[2]);
    const page = await context.newPage();
    await openScreen(page, locale, "decodable");
    const frames = await readFrameGaps(page);
    cases += 1;
    if (frames.some((frame) => frame === null)) {
      failures += 1;
      sample = sample || `${locale}: a dashed frame is missing`;
    } else {
      for (const frame of frames) {
        gapMin = Math.min(gapMin, frame.gap);
        if (!framePadVerdict(frame.gaps, 0)) {
          failures += 1;
          sample = sample || `${locale}: frame_gap_px=${frame.gap}`;
        }
      }
    }
    await page.close();
    await context.close();
  }
  emit("frame_content_gap_px_min", gapMin === 99 ? 0 : Math.round(gapMin));
  row("council r3 frame padding", cases === 2 && failures === 0,
    `frame_padding_cases=${cases} frame_padding_failures=${failures} frame_content_gap_px_min=${gapMin === 99 ? 0 : Math.round(gapMin)}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 14 council r3 page counter", async () => {
  let cases = 0;
  let failures = 0;
  let contrastMin = 99;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    const page = await context.newPage();
    await openScreen(page, locale, "reader");
    const counter = await readCounter(page);
    cases += 1;
    if (!counter || counter.text !== "2 / 8" || !counterVerdict(counter.background, counter.color)) {
      failures += 1;
      sample = sample || `${locale}: ${counter ? `${JSON.stringify(counter.text)} bg=${counter.background} color=${counter.color}` : "no [data-page-count]"}`;
    } else {
      contrastMin = Math.min(contrastMin, contrastOf(parseCssColor(counter.background), parseCssColor(counter.color)));
    }
    await page.close();
    await context.close();
  }
  emit("page_counter_contrast_min", contrastMin === 99 ? 0 : Math.round(contrastMin * 100) / 100);
  row("council r3 page counter", cases === 2 && failures === 0,
    `page_counter_cases=${cases} page_counter_failures=${failures} page_counter_contrast_min=${contrastMin === 99 ? 0 : Math.round(contrastMin * 100) / 100}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

await guarded("row 14 council r3 parent duration", async () => {
  let cases = 0;
  let failures = 0;
  let textsMax = 0;
  let controlsMax = 0;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    const page = await context.newPage();
    await page.goto(`${base}/${locale}/st/2/1`, { waitUntil: "load" });
    await page.waitForSelector("main[data-place]", { timeout: 20000 }).catch(() => {});
    const panel = await readParentPanel(page);
    cases += 1;
    if (!panel) {
      failures += 1;
      sample = sample || `${locale}: no parent panel`;
    } else {
      textsMax = Math.max(textsMax, panel.texts);
      controlsMax = Math.max(controlsMax, panel.controls);
      if (!nativeDurationVerdict(panel.texts, panel.controls)) {
        failures += 1;
        sample = sample || `${locale}: duration_texts=${panel.texts} native_controls=${panel.controls}`;
      }
    }
    await page.close();
    await context.close();
  }
  emit("parent_duration_texts", textsMax);
  emit("parent_native_controls", controlsMax);
  row("council r3 parent duration", cases === 2 && failures === 0,
    `parent_duration_cases=${cases} parent_duration_failures=${failures} duration_texts=${textsMax} native_controls=${controlsMax}${sample ? ` first=${JSON.stringify(sample)}` : ""}`);
});

// ---- Row 15: the brand chrome of the five screens (AC-4.1 to AC-4.3). ----
/** Reads the chrome hooks of the open page: the game bar, the crest, the logo, and the label. */
async function readBrandChrome(page) {
  return page.evaluate(() => {
    const label = document.querySelector("[data-level-week]");
    const logo = document.querySelector("[data-logo]");
    const labelText = label ? (label.textContent ?? "").trim() : "";
    let copies = 0;
    if (labelText) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if ((node.textContent ?? "").trim() === labelText) copies += 1;
        node = walker.nextNode();
      }
    }
    let hidden = 0;
    if (!label) {
      hidden = 1;
    } else {
      const style = getComputedStyle(label);
      const clipped = style.clipPath.includes("inset(50%")
        || (parseFloat(style.width) <= 1 && parseFloat(style.height) <= 1);
      if (label.getAttribute("aria-hidden") === "true"
        || label.closest("[aria-hidden='true']") !== null || clipped) hidden = 1;
    }
    return {
      game_bars: document.querySelectorAll("[data-game-bar]").length,
      progressbars: document.querySelectorAll('[role="progressbar"]').length,
      band_icons: document.querySelectorAll("[data-band-icon]").length,
      crest_elems: document.querySelectorAll("[data-crest]").length,
      logo_elems: document.querySelectorAll("[data-logo]").length,
      logo_name_ok: logo && logo.tagName.toLowerCase() === "img" && logo.getAttribute("alt") === "Storytime Advantage" ? 1 : 0,
      level_week_copies: copies,
      label_hidden: hidden,
    };
  });
}
await guarded("row 15 brand chrome", async () => {
  let cases = 0;
  let failures = 0;
  let copiesMax = 0;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    for (const screen of [...SCREENS, "question"]) {
      const page = await context.newPage();
      if (screen === "question") await openQuestion(page, locale);
      else await openScreen(page, locale, screen);
      const found = await readBrandChrome(page);
      cases += 1;
      copiesMax = Math.max(copiesMax, found.level_week_copies);
      if (!brandChromeVerdict(found)) {
        failures += 1;
        sample = sample || locale + " " + screen + ": " + JSON.stringify(found);
      }
      await page.close();
    }
    await context.close();
  }
  emit("brand_chrome_cases", cases);
  row("brand chrome", cases === 10 && failures === 0,
    "brand_chrome_cases=" + cases + " brand_chrome_failures=" + failures
    + " label_copies_max=" + copiesMax + (sample ? " first=" + sample : ""));
});

// ---- Row 16: the chrome tones of the look screens (AC-4.4 and AC-4.5). ----
/** The four chrome families of the look, with the selectors that read them. */
const BRAND_FAMILIES = [
  { name: "banner", selectors: ["header[data-hero] > h1", "main > h1"] },
  { name: "buttons", selectors: ["button"] },
  { name: "frames", selectors: ["section[aria-label]", "main > section"] },
  { name: "cards", selectors: ["ul[data-week-tiles] a", "[data-part=\"song\"] ol", "[data-page-content] > div", "main li", "main a[href]"] },
];
/** Reads the chrome elements of the open page: their family, their fill, and their label colour. */
async function readBrandElements(page) {
  return page.evaluate((families) => {
    const seen = new Set();
    const out = [];
    for (const family of families) {
      for (const selector of family.selectors) {
        for (const element of document.querySelectorAll(selector)) {
          if (seen.has(element)) continue;
          seen.add(element);
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          if (box.width <= 0 || box.height <= 0) continue;
          if (style.visibility === "hidden" || style.display === "none") continue;
          out.push({ family: family.name, background: style.backgroundColor, color: style.color });
        }
      }
    }
    return out;
  }, BRAND_FAMILIES);
}
/** Tells whether one colour holds the channels of one tone. */
function isRgbOf(color, channels) {
  return color !== null && color.r === channels[0] && color.g === channels[1] && color.b === channels[2];
}
/** The blue tones of the old look, as colour channels. */
const BRAND_BLUE = [[36, 95, 159], [47, 116, 189], [23, 64, 122], [19, 36, 78], [31, 85, 148]];
/** The brand tones, as colour channels. */
const BRAND_AMBER = [252, 211, 77];
const BRAND_BROWN = [146, 64, 14];
/** Sums the brand pairs of a list of chrome elements. */
function brandToneSummary(elements) {
  const summary = {
    families_checked: 0, chrome_pairs_checked: 0, chrome_blue_computed: 0,
    chrome_contrast_min: 0, amber_pairs: 0, brown_pairs: 0, families: [],
  };
  const byFamily = new Map();
  for (const item of elements) {
    const bg = parseCssColor(item.background);
    const fg = parseCssColor(item.color);
    if (!bg || bg.a !== 1) continue;
    if (!byFamily.has(item.family)) {
      byFamily.set(item.family, {
        name: item.family, pairs: 0, chrome_blue_computed: 0,
        amber_pairs: 0, brown_pairs: 0, contrast_min: 0,
      });
    }
    const family = byFamily.get(item.family);
    if (BRAND_BLUE.some((channels) => isRgbOf(bg, channels))) {
      family.chrome_blue_computed += 1;
      summary.chrome_blue_computed += 1;
    }
    const amber = isRgbOf(bg, BRAND_AMBER);
    const brown = isRgbOf(bg, BRAND_BROWN);
    if (!amber && !brown) continue;
    family.pairs += 1;
    summary.chrome_pairs_checked += 1;
    if (amber) { family.amber_pairs += 1; summary.amber_pairs += 1; }
    if (brown) { family.brown_pairs += 1; summary.brown_pairs += 1; }
    if (!fg) continue;
    const ratio = contrastOf(bg, fg);
    family.contrast_min = family.contrast_min === 0 ? ratio : Math.min(family.contrast_min, ratio);
    summary.chrome_contrast_min = summary.chrome_contrast_min === 0 ? ratio : Math.min(summary.chrome_contrast_min, ratio);
  }
  summary.families = [...byFamily.values()];
  summary.families_checked = byFamily.size;
  return summary;
}
await guarded("row 16 brand tones", async () => {
  let cases = 0;
  let failures = 0;
  const families = new Set();
  let pairs = 0;
  let blue = 0;
  let amber = 0;
  let brown = 0;
  let contrastMin = 0;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    for (const screen of SCREENS) {
      const page = await context.newPage();
      await openScreen(page, locale, screen);
      const summary = brandToneSummary(await readBrandElements(page));
      cases += 1;
      for (const family of summary.families) families.add(family.name);
      pairs += summary.chrome_pairs_checked;
      blue += summary.chrome_blue_computed;
      amber += summary.amber_pairs;
      brown += summary.brown_pairs;
      if (summary.chrome_contrast_min > 0) {
        contrastMin = contrastMin === 0 ? summary.chrome_contrast_min : Math.min(contrastMin, summary.chrome_contrast_min);
      }
      const total = {
        families_checked: families.size,
        chrome_pairs_checked: pairs,
        chrome_blue_computed: blue,
        chrome_contrast_min: contrastMin,
        amber_pairs: amber,
        brown_pairs: brown,
        families: [],
      };
      if (!brandTonesVerdict(total)) {
        failures += 1;
        sample = sample || locale + " " + screen + ": " + JSON.stringify(total);
      }
      await page.close();
    }
    await context.close();
  }
  emit("chrome_contrast_min", contrastMin === 0 ? 0 : Math.round(contrastMin * 100) / 100);
  emit("chrome_blue_computed", blue);
  emit("amber_pairs", amber);
  emit("brown_pairs", brown);
  row("brand tones", cases === 8 && failures === 0,
    "brand_tone_cases=" + cases + " brand_tone_failures=" + failures
    + " families_checked=" + families.size + " chrome_pairs_checked=" + pairs
    + " chrome_blue_computed=" + blue
    + " chrome_contrast_min=" + (contrastMin === 0 ? 0 : Math.round(contrastMin * 100) / 100)
    + " amber_pairs=" + amber + " brown_pairs=" + brown + (sample ? " first=" + sample : ""));
});

// ---- Row 17: the title plaque of the banner (AC-4.6). ----
/** Reads the title plaque: the text box against the plaque box, the font size, and the height. */
async function readBrandBanner(page) {
  return page.evaluate(() => {
    const plaque = document.querySelector("header[data-hero] > h1");
    if (!plaque) {
      return { text_align: "none", banner_top_gap_px: -1, banner_bottom_gap_px: -1, banner_ratio: 0, title_font_px: 0, banner_h_px: 0 };
    }
    const style = getComputedStyle(plaque);
    const box = plaque.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(plaque);
    const text = range.getBoundingClientRect();
    const font = parseFloat(style.fontSize);
    return {
      text_align: style.textAlign,
      banner_top_gap_px: Math.round(text.top - box.top),
      banner_bottom_gap_px: Math.round(box.bottom - text.bottom),
      banner_ratio: box.height > 0 ? font / box.height : 0,
      title_font_px: font,
      banner_h_px: Math.round(box.height),
    };
  });
}
await guarded("row 17 brand banner", async () => {
  let cases = 0;
  let failures = 0;
  let ratioMin = 99;
  let ratioMax = 0;
  let sample = "";
  for (const locale of LOCALES) {
    const context = await makeContext(VIEWPORTS[0]);
    const page = await context.newPage();
    const state = watch(page);
    await openScreen(page, locale, "week");
    const found = await readBrandBanner(page);
    const counts = await checkCounts(page, state);
    cases += 1;
    ratioMin = Math.min(ratioMin, found.banner_ratio);
    ratioMax = Math.max(ratioMax, found.banner_ratio);
    const ok = brandBannerVerdict({
      ...found,
      clipped_text: counts.clipped_text,
      page_overflow: counts.page_overflow,
    });
    if (!ok) {
      failures += 1;
      sample = sample || locale + ": " + JSON.stringify(found)
        + " clipped_text=" + counts.clipped_text + " page_overflow=" + counts.page_overflow;
    }
    await page.close();
    await context.close();
  }
  // A 60-character title (the V1 Thai string) steps down one size step and stays inside the plaque.
  const longContext = await makeContext(VIEWPORTS[0]);
  const longPage = await longContext.newPage();
  const longState = watch(longPage);
  await longPage.goto(base + "/th/st/3/6", { waitUntil: "load" });
  await settle(longPage);
  await longPage.evaluate((text) => {
    const plaque = document.querySelector("header[data-hero] > h1");
    if (plaque) plaque.textContent = text;
  }, THAI_LONG_TITLE);
  await settle(longPage);
  const longPlaque = await measurePlaque(longPage);
  const longCounts = await checkCounts(longPage, longState);
  if (longPlaque.overflow_px !== 0 || longCounts.clipped_text !== 0) failures += 1;
  await longPage.close();
  await longContext.close();
  const min = ratioMin === 99 ? 0 : Math.round(ratioMin * 1000) / 1000;
  const max = ratioMax === 0 ? 0 : Math.round(ratioMax * 1000) / 1000;
  emit("banner_ratio_min", min);
  emit("banner_ratio_max", max);
  row("brand banner", cases === 2 && failures === 0,
    "brand_banner_cases=" + cases + " brand_banner_failures=" + failures
    + " banner_ratio_min=" + min + " banner_ratio_max=" + max
    + " long_title_overflow_px=" + longPlaque.overflow_px
    + " long_title_clipped_text=" + longCounts.clipped_text + (sample ? " first=" + sample : ""));
});

// ---- Row 18: the pages of screens 6 to 9 (decision 1). ----
/** The pages that carry no frame and take the brand tones through their own class names. */
const BRAND_PAGES = [
  { label: "teacher week th", path: "/th/teacher/2/1", signedIn: true },
  { label: "teacher day th", path: "/th/teacher/2/1/1", signedIn: true },
  { label: "403 page th", path: "/th/teacher/2/2", signedIn: true },
  { label: "404 view th", path: "/th/st/4/1", signedIn: true },
  { label: "st fallback th", path: "/th/st", signedIn: true },
  { label: "sign_in th", path: "/th/sign-in", signedIn: false },
  { label: "join th", path: "/th/join", signedIn: false },
];
await guarded("row 18 brand pages", async () => {
  let cases = 0;
  let failures = 0;
  let pairsMin = 99;
  let contrastMin = 99;
  let sample = "";
  for (const item of BRAND_PAGES) {
    const context = await makeContext(VIEWPORTS[0], { signedIn: item.signedIn });
    const page = await context.newPage();
    const state = watch(page);
    let detail = "";
    let ok = false;
    let pairs = 0;
    let contrast = 0;
    try {
      const response = await page.goto(base + item.path, { waitUntil: "load" });
      await settle(page);
      const counts = await checkCounts(page, state);
      const summary = brandToneSummary(await readBrandElements(page));
      pairs = summary.chrome_pairs_checked;
      contrast = summary.chrome_contrast_min;
      pairsMin = Math.min(pairsMin, pairs);
      contrastMin = contrastMin === 99 ? contrast : Math.min(contrastMin, contrast);
      ok = brandPagesVerdict({
        console_errors: counts.console_errors,
        tap_under_48: counts.tap_under_48,
        page_overflow: counts.page_overflow,
        chrome_contrast_min: contrast,
        chrome_brand_pairs: pairs,
      });
      detail = "status=" + (response ? response.status() : 0)
        + " console_errors=" + counts.console_errors
        + " tap_under_48=" + counts.tap_under_48
        + " page_overflow=" + counts.page_overflow
        + " chrome_brand_pairs=" + pairs
        + " chrome_contrast_min=" + (contrast === 0 ? 0 : Math.round(contrast * 100) / 100);
    } catch (error) {
      detail = "the page raises an error: " + String(error).slice(0, 120);
    }
    cases += 1;
    if (!ok) {
      failures += 1;
      sample = sample || item.label + ": " + detail;
    }
    row("brand pages " + item.label, ok, detail);
    await page.close();
    await context.close();
  }
  emit("chrome_brand_pairs_min", pairsMin === 99 ? 0 : pairsMin);
  row("brand pages total", cases === BRAND_PAGES.length && failures === 0,
    "brand_page_cases=" + cases + " brand_page_failures=" + failures
    + " chrome_brand_pairs_min=" + (pairsMin === 99 ? 0 : pairsMin)
    + " chrome_contrast_min=" + (contrastMin === 99 ? 0 : Math.round(contrastMin * 100) / 100)
    + (sample ? " first=" + sample : ""));
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
printf 'name,class,role\nStaff One,staff,family\nTeacher One,teacher,teacher\n' > "$TMP_DIR/accounts/accounts.csv"
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
const shippedTitles = ["Hello!", "How Many?", "Paint!", "My Family", "I Have Two", "I Can See", "Is It a Ball?", "Unit 1 Review"];
const titleWeeks = shippedTitles.map((title, index) => [7 + index, title]);
for (const [week, title] of [[5, "Second Week"], [6, longTitle], ...titleWeeks]) {
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
  STORYTIME_TEACHER_ROUTES=1 \
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
