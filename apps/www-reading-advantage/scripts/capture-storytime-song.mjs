import { mkdirSync, statSync } from "node:fs";
import { chromium } from "@playwright/test";

const port = Number(process.env.PORT);
const output = process.env.CAPTURE_DIR;
if (!port || !output) throw new Error("PORT and CAPTURE_DIR are required");
mkdirSync(output, { recursive: true });

const DESKTOP_VIDEO_ID = "Id4_X0nQnV4";
const PHONE_VIDEO_ID = "nwJW8yENJnY";
const DESKTOP_POSTER = "/images/storytime-advantage/song-week-1-desktop-poster.jpg";
const PHONE_POSTER = "/images/storytime-advantage/song-week-1-phone-poster.jpg";
const VIDEO_HOST_PARTS = ["youtube", "google"];
const PLAYER_ERRORS = ["video unavailable", "watch on youtube", "sign in to confirm", "error"];

const VIEWS = [
  { locale: "en", label: "desktop", width: 1440, height: 900, file: "en-desktop", poster: DESKTOP_POSTER, video: DESKTOP_VIDEO_ID, ratio: 16 / 9 },
  { locale: "en", label: "phone", width: 390, height: 844, file: "en-phone", poster: PHONE_POSTER, video: PHONE_VIDEO_ID, ratio: 9 / 16 },
  { locale: "th", label: "desktop", width: 1440, height: 900, file: "th-desktop", poster: DESKTOP_POSTER, video: DESKTOP_VIDEO_ID, ratio: 16 / 9 },
  { locale: "th", label: "phone", width: 390, height: 844, file: "th-phone", poster: PHONE_POSTER, video: PHONE_VIDEO_ID, ratio: 9 / 16 },
  { locale: "th", label: "phone-360", width: 360, height: 780, file: "th-phone-360", poster: PHONE_POSTER, video: PHONE_VIDEO_ID, ratio: 9 / 16 },
];

const captures = [];

/**
 * Reads the state of the song player box in the page.
 * @returns The box size, the poster path, the frame count, and the page width.
 */
async function readBox(page) {
  return page.evaluate(() => {
    const box = document.querySelector("[data-testid='song-player-box']");
    if (!box) return { missing: true };
    const poster = box.querySelector("picture img");
    const rect = box.getBoundingClientRect();
    return {
      missing: false,
      posterSrc: poster?.currentSrc || poster?.getAttribute("src") || "",
      posterAlt: poster?.getAttribute("alt"),
      iframeCount: document.querySelectorAll("iframe").length,
      width: rect.width,
      height: rect.height,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportHeight: window.innerHeight,
    };
  });
}

/**
 * Checks the size of the player box against the expected ratio.
 * @param view The view of the capture.
 * @param state The state of the box.
 * @param stage The stage of the capture.
 */
function checkRatio(view, state, stage) {
  const ratio = state.width / state.height;
  if (Math.abs(ratio - view.ratio) > 0.02) {
    throw new Error(`${view.file} ${stage}: box ratio ${ratio.toFixed(3)} is not ${view.ratio.toFixed(3)}`);
  }
  if (view.ratio < 1 && state.height > state.viewportHeight * 0.8) {
    throw new Error(`${view.file} ${stage}: box height ${state.height} is over 80% of ${state.viewportHeight}`);
  }
}

/**
 * Checks that the page has no horizontal overflow.
 * @param view The view of the capture.
 * @param state The state of the box.
 * @param stage The stage of the capture.
 */
function checkOverflow(view, state, stage) {
  if (state.documentWidth > view.width || state.bodyWidth > view.width) {
    throw new Error(`${view.file} ${stage}: horizontal overflow ${state.documentWidth}/${state.bodyWidth} at ${view.width}`);
  }
}

/**
 * Scrolls the player box into the middle of the screen.
 * @param page The page of the capture.
 */
async function centerBox(page) {
  await page.evaluate(() => {
    const box = document.querySelector("[data-testid='song-player-box']");
    box?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
}

/**
 * Captures one view before and after the tap.
 * @param view The view of the capture.
 */
async function captureView(view) {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-dev-shm-usage", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    const response = await page.goto(`http://127.0.0.1:${port}/${view.locale}/products/storytime-advantage`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    if (response?.status() !== 200) throw new Error(`${view.file}: HTTP ${response?.status()}`);

    const hostRequests = requests.filter((url) => {
      try {
        const host = new URL(url).host;
        return VIDEO_HOST_PARTS.some((part) => host.includes(part));
      } catch {
        return false;
      }
    });
    if (hostRequests.length) {
      throw new Error(`${view.file}: ${hostRequests.length} video host request(s) before the tap: ${hostRequests.join(", ")}`);
    }

    const button = page.locator("[data-testid='song-player-box'] button");
    await button.waitFor({ state: "visible" });
    const before = await readBox(page);
    if (before.missing) throw new Error(`${view.file}: the player box is missing`);
    if (before.iframeCount !== 0) throw new Error(`${view.file}: ${before.iframeCount} frame(s) before the tap`);
    if (!before.posterSrc.endsWith(view.poster)) throw new Error(`${view.file}: poster ${before.posterSrc} is not ${view.poster}`);
    if (before.posterAlt !== "") throw new Error(`${view.file}: poster alt is not empty`);
    checkRatio(view, before, "before");
    checkOverflow(view, before, "before");

    await centerBox(page);
    const beforePath = `${output}/${view.file}-before.png`;
    await page.screenshot({ path: beforePath, animations: "disabled" });
    if (statSync(beforePath).size === 0) throw new Error(`${view.file}: the before capture file is empty`);

    await button.click();
    await page.waitForSelector("[data-testid='song-player-box'] iframe", { timeout: 30000 });
    await page.waitForTimeout(2500);
    const after = await readBox(page);
    if (after.missing) throw new Error(`${view.file}: the player box is missing after the tap`);
    if (after.iframeCount !== 1) throw new Error(`${view.file}: ${after.iframeCount} frame(s) after the tap`);
    const src = await page.locator("[data-testid='song-player-box'] iframe").getAttribute("src");
    if (!src || !src.includes(view.video)) throw new Error(`${view.file}: the frame source ${src} does not hold ${view.video}`);
    if (!src.includes("www.youtube-nocookie.com")) throw new Error(`${view.file}: the frame source ${src} is not the privacy host`);
    checkRatio(view, after, "after");
    checkOverflow(view, after, "after");

    const frame = page.frames().find((item) => item.url().includes("youtube"));
    let playerText = "";
    if (frame) {
      playerText = await frame.evaluate(() => document.body?.innerText ?? "").catch(() => "");
    }
    const errorText = PLAYER_ERRORS.find((part) => playerText.toLowerCase().includes(part));
    if (errorText) throw new Error(`${view.file}: the player shows an error: ${errorText}. Player text: ${playerText.slice(0, 300)}`);

    await centerBox(page);
    const afterPath = `${output}/${view.file}-after.png`;
    await page.screenshot({ path: afterPath, animations: "disabled" });
    if (statSync(afterPath).size === 0) throw new Error(`${view.file}: the after capture file is empty`);

    captures.push({
      file: `${view.file}-before.png`,
      locale: view.locale,
      width: view.width,
      status: response.status(),
      poster: view.poster,
      videoHostRequests: hostRequests.length,
      video: null,
    });
    captures.push({
      file: `${view.file}-after.png`,
      locale: view.locale,
      width: view.width,
      status: response.status(),
      poster: view.poster,
      videoHostRequests: hostRequests.length,
      video: view.video,
    });
    console.log(`${view.file}: HTTP ${response.status()}, ${hostRequests.length} video host request(s) before the tap, poster ${view.poster}, video ${view.video}`);
    await page.close();
  } catch (error) {
    console.error(`${view.file} capture failed:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

for (const locale of ["en", "th"]) {
  const response = await fetch(`http://127.0.0.1:${port}/${locale}/products/storytime-advantage`);
  const html = await response.text();
  if (html.toLowerCase().includes("youtube")) throw new Error(`${locale}: the server HTML holds a youtube string`);
  if (response.status !== 200) throw new Error(`${locale}: HTTP ${response.status}`);
}

for (const view of VIEWS) {
  await captureView(view);
}

console.log(JSON.stringify(captures, null, 2));
