/**
 * T3 browser QA driver for the primary-advantage APK games suite.
 * TEST-ONLY artifact. Drives a headless system Chrome via Playwright.
 * Writes screenshots and results.json next to this script.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const PASSWORD = "QaTest!2026x";

const CATALOG_IDS = [
  "dragon-flight", "astral-mage", "sorcerer-ziggurat", "dragon-rider",
  "spellweavers-run", "shadow-gate-dungeon", "labyrinth-goblin-king",
  "griffin-riders-escape", "castle-defense", "magic-defense", "rpg-battle",
  "wizard-vs-zombie", "enchanted-library", "rune-match",
  "alchemists-synthesis", "potion-rush", "dungeon-liberator",
  "rune-forge-chamber", "village-guardian", "abyssal-well",
  "archers-revenge", "storm-castle-tower", "griffin-sky-joust", "realm-carver",
  "paladins-twin-soul", "devourer-slime", "haunted-library", "gryphon-patrol",
];

const args = process.argv.slice(2);
const USERNAME = args[0] ?? "qa-student-a3";
const IDS = args[1] ? args[1].split(",") : CATALOG_IDS;
const TAG = args[2] ?? (USERNAME === "qa-student-a3" ? "a3" : "b1");
const DO_CATALOG = args[3] !== "--no-catalog";

mkdirSync(HERE, { recursive: true });
const resultsPath = join(HERE, `results-${TAG}.json`);
const results = existsSync(resultsPath)
  ? JSON.parse((await import("node:fs")).readFileSync(resultsPath, "utf8"))
  : { user: USERNAME, games: [] };

function save() {
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
}

/** Creates a fresh authenticated browser context. */
async function newContext(browser, username) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    args: [],
  });
  const login = await context.request.post(`${BASE}/api/auth/login`, {
    data: { username, password: PASSWORD },
    timeout: 120_000,
  });
  if (login.status() !== 200) {
    throw new Error(`Login failed for ${username}: HTTP ${login.status()}`);
  }
  return context;
}

/** Attaches console/pageerror capture scoped to one game. */
function attachLogs(page) {
  const logs = [];
  const onConsole = (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      logs.push({ kind: type, text: msg.text().slice(0, 600) });
    }
  };
  const onPageError = (err) => logs.push({ kind: "pageerror", text: String(err).slice(0, 600) });
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return () => {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  };
}

/**
 * Samples composited canvas pixels from an element screenshot.
 * Direct drawImage of a WebGL canvas reads black without preserveDrawingBuffer,
 * so Playwright composites the element itself.
 * @param page Page hosting the canvas.
 * @param canvas Canvas locator.
 * @returns Blank flag, unique color count, and non-uniform pixel ratio.
 */
async function canvasStats(page, canvas) {
  const hasCanvas = await canvas.evaluate((node) => Boolean(node)).catch(() => false);
  if (!hasCanvas) return { hasCanvas: false };
  let source;
  try {
    const box = await canvas.boundingBox();
    if (!box) return { hasCanvas: true, readable: false };
    source = await page.screenshot({
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      timeout: 4_000,
    });
  } catch {
    return { hasCanvas: true, readable: false };
  }
  return page.evaluate((dataUrl) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const copy = document.createElement("canvas");
      copy.width = 64;
      copy.height = 36;
      const ctx = copy.getContext("2d", { willReadFrequently: true });
      if (!ctx) return resolve({ hasCanvas: true, readable: false });
      ctx.drawImage(image, 0, 0, 64, 36);
      const data = ctx.getImageData(0, 0, 64, 36).data;
      const colors = new Set();
      let nonWhite = 0;
      let nonBlack = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        colors.add((r >> 4) * 256 + (g >> 4) * 16 + (b >> 4));
        if (r < 245 || g < 245 || b < 245) nonWhite += 1;
        if (r > 12 || g > 12 || b > 12) nonBlack += 1;
      }
      const total = 64 * 36;
      resolve({
        hasCanvas: true,
        readable: true,
        uniqueColors: colors.size,
        nonWhiteRatio: nonWhite / total,
        nonBlackRatio: nonBlack / total,
      });
    };
    image.onerror = () => resolve({ hasCanvas: true, readable: false });
    image.src = dataUrl;
  }), `data:image/png;base64,${source.toString("base64")}`);
}

const PLAY_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "1", "2", "3"];

/**
 * Plays one cartridge for ~45 seconds with generic mouse and keyboard input.
 * @param page Authenticated page already on the cartridge route.
 * @param id Cartridge identifier.
 * @param record Result object mutated during play.
 */
async function playGame(page, id, index, record) {
  const prefix = `${TAG}-${String(index + 1).padStart(2, "0")}-${id}`;

  // Briefing phase.
  const playNow = page.getByRole("button", { name: /^play now/i }).first();
  await playNow.waitFor({ state: "visible", timeout: 120_000 });
  await page.screenshot({ path: join(HERE, `${prefix}-01-briefing.png`) });

  const completeResponses = [];
  const apiErrors = [];
  const onResponse = async (response) => {
    const url = response.url();
    if (url.includes("/api/v1/apk/") && response.status() >= 400) {
      let body = "";
      try { body = (await response.text()).slice(0, 300); } catch { /* ignore */ }
      apiErrors.push({ url: url.replace(BASE, ""), status: response.status(), body });
    }
    if (url.endsWith("/api/v1/apk/complete") && response.request().method() === "POST") {
      let payload = null;
      try { payload = await response.json(); } catch { /* ignore */ }
      completeResponses.push({ status: response.status(), payload });
    }
  };
  page.on("response", onResponse);

  await playNow.click();
  const canvas = page.locator("[data-apk-canvas-host] canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 90_000 });
  await page.waitForTimeout(4_000);
  await page.screenshot({ path: join(HERE, `${prefix}-02-start.png`) });

  const started = Date.now();
  const deadline = started + 45_000;
  const resultPattern = /game complete|play again|session complete|try again|victory|defeat|you (win|lose)/i;
  let blankAt20 = false;
  let midShotTaken = false;
  let actionIndex = 0;

  while (Date.now() < deadline) {
    const elapsed = Date.now() - started;

    // Blank-canvas checks at ~5s and ~20s (skipped once the result screen shows).
    if (elapsed > 4_500 && elapsed < 6_500) {
      const stats = await canvasStats(page, canvas);
      record.stats5s = stats;
    }
    if (elapsed > 9_000 && elapsed < 11_000) {
      const stats = await canvasStats(page, canvas);
      record.stats10s = stats;
    }
    if (elapsed > 19_000 && elapsed < 21_500 && !record.resultScreen) {
      const stats = await canvasStats(page, canvas);
      record.stats20s = stats;
      blankAt20 = stats.readable !== true
        || (stats.uniqueColors < 10 && (stats.nonWhiteRatio > 0.995 || stats.nonBlackRatio < 0.02));
      if (blankAt20) record.blankAt20s = true;
    }
    if (elapsed > 12_000 && !midShotTaken) {
      await page.screenshot({ path: join(HERE, `${prefix}-03-midplay.png`) });
      midShotTaken = true;
    }

    // Terminal result screen check.
    if (await page.getByText(resultPattern).first().isVisible().catch(() => false)) {
      record.resultScreen = true;
      break;
    }
    if (completeResponses.length > 0) {
      record.resultScreen = true;
      break;
    }

    // Generic input: alternate keyboard presses with canvas clicks.
    const box = await canvas.boundingBox();
    if (actionIndex % 2 === 0 && box) {
      const key = PLAY_KEYS[actionIndex % PLAY_KEYS.length];
      await page.keyboard.press(key === "Space" ? "Space" : key);
    } else if (box) {
      // Weighted clicks: answer-choice band near bottom, otherwise anywhere.
      const zones = [
        { x: 0.22, y: 0.82 }, { x: 0.5, y: 0.82 }, { x: 0.78, y: 0.82 },
        { x: 0.3, y: 0.55 }, { x: 0.7, y: 0.5 }, { x: 0.5, y: 0.35 },
        { x: 0.15, y: 0.7 }, { x: 0.85, y: 0.65 },
      ];
      const z = zones[actionIndex % zones.length];
      await page.mouse.click(box.x + box.width * z.x, box.y + box.height * z.y);
    }
    actionIndex += 1;
    await page.waitForTimeout(750);
  }

  await page.waitForTimeout(1_500);
  await page.screenshot({ path: join(HERE, `${prefix}-04-end.png`) });

  // Wait up to 20s for the completion save to settle ("Saving progress…" clears).
  if (record.resultScreen) {
    const saveDeadline = Date.now() + 20_000;
    while (Date.now() < saveDeadline) {
      if (completeResponses.length > 0) break;
      const stillSaving = await page.getByText(/saving progress/i).first()
        .isVisible().catch(() => false);
      if (!stillSaving && !record.resultTextVisible) break;
      await page.waitForTimeout(1_000);
    }
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: join(HERE, `${prefix}-05-results.png`) });
  }

  const statsEnd = await canvasStats(page, canvas);
  record.statsEnd = statsEnd;
  record.completionCalls = completeResponses;
  record.apiErrors = apiErrors;
  page.off("response", onResponse);
  const xp = completeResponses.map((c) => c.payload?.xpEarned).filter((v) => typeof v === "number");
  record.xpEarned = xp.length ? Math.max(...xp) : null;
  record.saveStatus = completeResponses[0]?.status ?? null;
  record.bodyText = (await page.locator("body").innerText().catch(() => "")).slice(0, 1200);
  record.resultTextVisible = await page.getByText(resultPattern).first().isVisible().catch(() => false);
  return blankAt20;
}

/** Runs the full pass for one user over the requested cartridges. */
async function runPass(browser, username, ids, tag, withCatalog) {
  const context = await newContext(browser, username);
  const page = await context.newPage();
  const detachLogs = attachLogs(page);
  page.setDefaultTimeout(120_000);

  if (withCatalog) {
    const catalogLogs = [];
    const catConsole = (msg) => {
      if (msg.type() === "error") catalogLogs.push(msg.text().slice(0, 600));
    };
    page.on("console", catConsole);
    await page.goto(`${BASE}/en/student/games`, { timeout: 150_000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(12_000);
    await page.screenshot({ path: join(HERE, `${tag}-00-catalog.png`), fullPage: true });

    const cardInfo = await page.evaluate(() => {
      const anchors = [...document.querySelectorAll('a[href*="/student/games/apk/"]')];
      const cards = anchors.map((a) => ({
        href: a.getAttribute("href"),
        title: a.querySelector("h2")?.textContent?.trim() ?? a.textContent?.trim().slice(0, 80),
        hasImage: Boolean(a.querySelector("img")),
      }));
      const images = [...document.images].map((img) => ({
        src: img.currentSrc || img.src,
        broken: img.complete && img.naturalWidth === 0,
      }));
      const bodyText = document.body.innerText;
      return {
        cards,
        brokenImages: images.filter((i) => i.broken).map((i) => i.src),
        imageCount: images.length,
        challengePanelText: (bodyText.match(/Class challenges[\s\S]{0,400}/)?.[0] ?? "").slice(0, 400),
      };
    });
    results.catalog = cardInfo;
    results.catalogConsoleErrors = catalogLogs;
    page.off("console", catConsole);
    save();
  }

  for (const [i, id] of ids.entries()) {
    if (results.games.some((g) => g.id === id)) {
      console.log(`[${tag}] skip ${id} (done)`);
      continue;
    }
    const record = { id, startedAt: new Date().toISOString(), logs: [] };
    console.log(`[${tag}] ${i + 1}/${ids.length} ${id}`);
    let pageLogs = [];
    const onConsole = (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        pageLogs.push({ kind: msg.type(), text: msg.text().slice(0, 600) });
      }
    };
    const onPageError = (err) => pageLogs.push({ kind: "pageerror", text: String(err).slice(0, 600) });
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    const started = Date.now();
    try {
      await page.goto(`${BASE}/en/student/games/apk/${id}`, {
        timeout: 150_000, waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(6_000);

      let ready = false;
      try {
        await page.getByRole("button", { name: /^play now/i }).first()
          .waitFor({ state: "visible", timeout: 120_000 });
        ready = true;
      } catch {
        ready = false;
      }

      if (!ready) {
        const alertText = await page.getByRole("alert").first()
          .innerText().catch(() => "");
        record.verdict = alertText ? "BLOCKED" : "FAIL";
        record.reason = alertText.slice(0, 400)
          || "Play now button never appeared (content stuck loading or chunk error)";
        await page.screenshot({ path: join(HERE, `${tag}-${String(i + 1).padStart(2, "0")}-${id}-00-loadfail.png`) })
          .catch(() => undefined);
      } else {
        await playGame(page, id, i, record);
        const stats = record.stats20s ?? record.stats10s ?? record.stats5s;
        if (record.blankAt20s) {
          record.verdict = "FAIL";
          record.reason = "Canvas blank after 20s";
        } else if (stats && stats.readable) {
          record.verdict = "PASS";
          if (record.resultScreen && !record.stats20s) record.earlyEnd = true;
        } else if (record.resultScreen) {
          // Ended before any in-play sample; the start screenshot plus the
          // result screen show a rendered game.
          record.verdict = "PASS";
          record.earlyEnd = true;
        } else {
          record.verdict = "FAIL";
          record.reason = "Canvas not readable";
        }
      }
    } catch (error) {
      record.verdict = "FAIL";
      record.reason = String(error?.message ?? error).slice(0, 400);
      await page.screenshot({ path: join(HERE, `${tag}-${String(i + 1).padStart(2, "0")}-${id}-00-error.png`) })
        .catch(() => undefined);
    } finally {
      record.durationMs = Date.now() - started;
      record.logs = pageLogs;
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      results.games.push(record);
      save();
      console.log(`[${tag}]  -> ${record.verdict} ${record.reason ?? ""} (${record.durationMs}ms)`);
    }
  }

  detachLogs();
  await context.close();
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

try {
  await runPass(browser, USERNAME, IDS, TAG, DO_CATALOG);
} finally {
  await browser.close();
  save();
}
console.log("DONE");
