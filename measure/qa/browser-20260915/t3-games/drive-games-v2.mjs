/**
 * T3 browser QA driver (pass 2) for the primary-advantage APK games suite.
 * TEST-ONLY artifact. Headless system Chrome via Playwright.
 *
 * Covers pass-2 scope:
 *   - catalog re-check with a seeded active class challenge
 *   - retests: storm-castle-tower, paladins-twin-soul (pass-1 cold-load stalls)
 *   - realm-carver start-guard investigation (Play now + Practice tutorial)
 *   - missing pass-1 games: haunted-library, gryphon-patrol
 *   - deeper play: rpg-battle, rune-match (pass-1 false-positive early exit)
 *   - challenge launch flow (?challengeId=)
 *   - b1 cross-school spot check (wizard-vs-zombie, castle-defense)
 *
 * Writes screenshots and results-v2.json next to this script.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const PASSWORD = "QaTest!2026x";
const PLAY_MS = 50_000;

mkdirSync(HERE, { recursive: true });
const resultsPath = join(HERE, "results-v2.json");
const results = existsSync(resultsPath)
  ? JSON.parse(readFileSync(resultsPath, "utf8"))
  : { startedAt: new Date().toISOString(), passes: {} };
function save() { writeFileSync(resultsPath, JSON.stringify(results, null, 2)); }

/** Creates a fresh authenticated browser context (cookie session via login API). */
async function newContext(browser, username) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const login = await context.request.post(`${BASE}/api/auth/login`, {
    data: { username, password: PASSWORD },
    timeout: 120_000,
  });
  if (login.status() !== 200) throw new Error(`Login failed for ${username}: HTTP ${login.status()}`);
  return context;
}

/** Attaches dedup console/pageerror capture, returning the live log array. */
function attachLogs(page) {
  const logs = [];
  const seen = new Set();
  const push = (kind, text) => {
    const key = `${kind}:${text.slice(0, 200)}`;
    const existing = logs.find((l) => l.key === key);
    if (existing) { existing.count += 1; return; }
    logs.push({ key, kind, text: text.slice(0, 700), count: 1 });
  };
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") push(msg.type(), msg.text());
  });
  page.on("pageerror", (err) => push("pageerror", String(err)));
  return logs;
}

/**
 * Samples composited canvas pixels from a clipped element screenshot.
 * WebGL canvases read black without preserveDrawingBuffer, so Playwright
 * composites the element itself.
 */
async function canvasStats(page, canvas) {
  const hasCanvas = await canvas.evaluate((node) => Boolean(node)).catch(() => false);
  if (!hasCanvas) return { hasCanvas: false };
  let source;
  try {
    const box = await canvas.boundingBox();
    if (!box || box.width < 10 || box.height < 10) return { hasCanvas: true, readable: false };
    source = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height }, timeout: 4_000 });
  } catch {
    return { hasCanvas: true, readable: false };
  }
  return page.evaluate((dataUrl) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const copy = document.createElement("canvas");
      copy.width = 64; copy.height = 36;
      const ctx = copy.getContext("2d", { willReadFrequently: true });
      if (!ctx) return resolve({ hasCanvas: true, readable: false });
      ctx.drawImage(image, 0, 0, 64, 36);
      const data = ctx.getImageData(0, 0, 64, 36).data;
      const colors = new Set();
      let nonWhite = 0, nonBlack = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        colors.add((r >> 4) * 256 + (g >> 4) * 16 + (b >> 4));
        if (r < 245 || g < 245 || b < 245) nonWhite += 1;
        if (r > 12 || g > 12 || b > 12) nonBlack += 1;
      }
      const total = 64 * 36;
      resolve({ hasCanvas: true, readable: true, uniqueColors: colors.size,
        nonWhiteRatio: nonWhite / total, nonBlackRatio: nonBlack / total });
    };
    image.onerror = () => resolve({ hasCanvas: true, readable: false });
    image.src = dataUrl;
  }), `data:image/png;base64,${source.toString("base64")}`);
}

/** Mean absolute pixel difference between two clipped canvas screenshots. */
async function motionRatio(page, canvas, before) {
  const box = await canvas.boundingBox();
  if (!box) return null;
  const after = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height }, timeout: 4_000 });
  return page.evaluate(([b64a, b64b]) => new Promise((resolve) => {
    let pending = 2;
    const frames = [];
    const step = () => { if (--pending !== 0) return;
      const c = document.createElement("canvas"); c.width = 64; c.height = 36;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const datas = [];
      for (const img of frames) {
        ctx.clearRect(0, 0, 64, 36); ctx.drawImage(img, 0, 0, 64, 36);
        datas.push(ctx.getImageData(0, 0, 64, 36).data);
      }
      let diff = 0;
      for (let i = 0; i < datas[0].length; i += 4) {
        diff += Math.abs(datas[0][i] - datas[1][i]) + Math.abs(datas[0][i + 1] - datas[1][i + 1]) + Math.abs(datas[0][i + 2] - datas[1][i + 2]);
      }
      resolve(diff / (64 * 36 * 3 * 255));
    };
    for (const b64 of [b64a, b64b]) {
      const img = new Image();
      img.onload = () => { frames.push(img); step(); };
      img.onerror = () => resolve(null);
      img.src = `data:image/png;base64,${b64}`;
    }
  }), [before.toString("base64"), after.toString("base64")]).catch(() => null);
}

const GENERIC_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "ArrowLeft", "ArrowRight"];
const RPG_KEYS = ["1", "2", "3", "1", "2", "ArrowUp", "ArrowDown"];
const CLICK_ZONES = [
  { x: 0.22, y: 0.82 }, { x: 0.5, y: 0.82 }, { x: 0.78, y: 0.82 },
  { x: 0.3, y: 0.55 }, { x: 0.7, y: 0.5 }, { x: 0.5, y: 0.35 },
  { x: 0.15, y: 0.7 }, { x: 0.85, y: 0.65 },
];

/**
 * Plays one cartridge with generic or RPG-style input for ~50s.
 * Screenshots briefing/start/midplay/end/results and records canvas evidence.
 */
async function playGame(page, prefix, style = "generic") {
  const record = { logs: attachLogs(page) };
  const completionCalls = [];
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
      let reqBody = null;
      try { reqBody = JSON.parse(response.request().postData() ?? "{}"); } catch { /* ignore */ }
      completionCalls.push({ status: response.status(), payload, challengeRunId: reqBody?.challengeRunId ?? null });
    }
  };
  page.on("response", onResponse);

  const playNow = page.getByRole("button", { name: /^Play now/i }).first();
  await playNow.waitFor({ state: "visible", timeout: 120_000 });
  await page.screenshot({ path: join(HERE, `${prefix}-01-briefing.png`) });

  const startGuard = page.getByText(/Game could not start/i).first();
  if (await startGuard.isVisible().catch(() => false)) {
    record.startGuard = (await startGuard.innerText().catch("")).slice(0, 300);
  }

  await playNow.click();
  const canvas = page.locator("[data-apk-canvas-host] canvas").first();
  let canvasOk = true;
  try {
    await canvas.waitFor({ state: "visible", timeout: 30_000 });
  } catch {
    canvasOk = false;
  }
  await page.waitForTimeout(4_000);
  await page.screenshot({ path: join(HERE, `${prefix}-02-start.png`) });

  if (!canvasOk) {
    const guard = await page.getByText(/Game could not start/i).first().innerText().catch(() => "");
    record.verdict = "FAIL";
    record.reason = guard || "Canvas never appeared after Play now";
    record.apiErrors = apiErrors;
    record.completionCalls = completionCalls;
    page.off("response", onResponse);
    return record;
  }

  record.statsStart = await canvasStats(page, canvas);
  const box0 = await canvas.boundingBox();
  const startClip = await page.screenshot({ clip: { x: box0.x, y: box0.y, width: box0.width, height: box0.height } });

  const resultSection = page.locator("section[aria-label='Game result']").first();
  const started = Date.now();
  const deadline = started + PLAY_MS;
  let midTaken = false;
  let action = 0;
  let endedAt = null;
  while (Date.now() < deadline) {
    const elapsed = Date.now() - started;
    if (elapsed > 10_000 && elapsed < 12_000) record.stats10s = await canvasStats(page, canvas);
    if (elapsed > 20_000 && elapsed < 23_000) {
      record.stats20s = await canvasStats(page, canvas);
      record.motionAt20s = await motionRatio(page, canvas, startClip);
    }
    if (elapsed > 14_000 && !midTaken) {
      await page.screenshot({ path: join(HERE, `${prefix}-03-midplay.png`) });
      midTaken = true;
    }
    if (await resultSection.isVisible().catch(() => false)) { endedAt = Date.now() - started; break; }
    if (completionCalls.length > 0) { endedAt = Date.now() - started; break; }

    const box = await canvas.boundingBox();
    const keys = style === "rpg" ? RPG_KEYS : GENERIC_KEYS;
    if (action % 2 === 0 && box) {
      await page.keyboard.press(keys[action % keys.length]);
    } else if (box) {
      const z = CLICK_ZONES[action % CLICK_ZONES.length];
      await page.mouse.click(box.x + box.width * z.x, box.y + box.height * z.y);
    }
    action += 1;
    await page.waitForTimeout(700);
  }

  await page.waitForTimeout(1_500);
  await page.screenshot({ path: join(HERE, `${prefix}-04-end.png`) });

  const resultVisible = await resultSection.isVisible().catch(() => false);
  if (resultVisible || completionCalls.length > 0) {
    // Allow the save to settle.
    const saveDeadline = Date.now() + 15_000;
    while (Date.now() < saveDeadline) {
      const saving = await page.getByText(/Saving progress/i).first().isVisible().catch(() => false);
      if (!saving) break;
      await page.waitForTimeout(1_000);
    }
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: join(HERE, `${prefix}-05-results.png`) });
    record.resultText = (await resultSection.innerText().catch("")).slice(0, 500);
  }
  record.resultVisible = resultVisible;
  record.endedAfterMs = endedAt;
  record.statsEnd = await canvasStats(page, canvas);
  record.completionCalls = completionCalls;
  record.apiErrors = apiErrors;
  page.off("response", onResponse);

  const blank = record.stats20s && (record.stats20s.readable !== true
    || (record.stats20s.uniqueColors < 10 && (record.stats20s.nonWhiteRatio > 0.995 || record.stats20s.nonBlackRatio < 0.02)));
  const stats = record.stats20s ?? record.stats10s ?? record.statsStart;
  if (blank) { record.verdict = "FAIL"; record.reason = "Canvas blank after 20s"; }
  else if (stats?.readable) { record.verdict = "PASS"; }
  else { record.verdict = "FAIL"; record.reason = "Canvas not readable"; }
  return record;
}

/** Loads a cartridge route, waiting for briefing or a load-time alert. */
async function openGame(page, id) {
  await page.goto(`${BASE}/en/student/games/apk/${id}`, { timeout: 150_000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6_000);
  try {
    await page.getByRole("button", { name: /^Play now/i }).first().waitFor({ state: "visible", timeout: 90_000 });
    return "ready";
  } catch {
    return "unready";
  }
}

/** Launches one isolated headless browser. */
async function launchBrowser() {
  return chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required",
      "--disable-dev-shm-usage", "--renderer-process-limit=1"],
  });
}

/**
 * Opens a fresh browser + authenticated page for one isolated task.
 * Tracks renderer crashes and disconnects so a crash fails only one game.
 */
async function isolatedSession(username, fn) {
  const browser = await launchBrowser();
  const crashInfo = { pageCrashed: false, disconnected: false };
  browser.on("disconnected", () => { crashInfo.disconnected = true; });
  let context;
  try {
    context = await newContext(browser, username);
    const page = await context.newPage();
    page.setDefaultTimeout(120_000);
    page.on("crash", () => { crashInfo.pageCrashed = true; });
    await fn(page, crashInfo);
  } finally {
    await context?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

/** Runs the a3 catalog check in an isolated browser. */
async function a3Catalog() {
  const out = results.passes.a3 ??= { retests: {}, challenge: null };
  if (out.catalogPanel) { console.log("[a3] skip catalog"); return; }
  console.log("[a3] catalog");
  await isolatedSession("qa-student-a3", async (page) => {
    await page.goto(`${BASE}/en/student/games`, { timeout: 150_000, waitUntil: "domcontentloaded" });
    await page.getByText(/QA Wizard Sprint/i).first().waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(2_000);
    await page.screenshot({ path: join(HERE, "a3-00-catalog-challenge.png"), fullPage: true });
    out.catalogPanel = (await page.locator("section[aria-label='Class challenges']").innerText().catch("")).slice(0, 800);

    // Best-effort dev indicator ("N Issue") popover.
    const issueBtn = page.locator("button, [role='button']", { hasText: /issue/i }).first();
    if (await issueBtn.isVisible().catch(() => false)) {
      await issueBtn.click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(1_500);
      await page.screenshot({ path: join(HERE, "a3-00b-dev-issues.png") });
    }
    save();
  });
}

/** Runs one isolated a3 retest game. */
async function a3Game(id, style) {
  const out = results.passes.a3 ??= { retests: {}, challenge: null };
  if (out.retests[id]) { console.log(`[a3] skip ${id}`); return; }
  console.log(`[a3] ${id}`);
  const started = Date.now();
  const record = { id, startedAt: new Date().toISOString() };
  await isolatedSession("qa-student-a3", async (page, crashInfo) => {
    try {
      const state = await openGame(page, id);
      if (crashInfo.pageCrashed || crashInfo.disconnected) throw new Error("renderer crashed during load");
      if (state !== "ready") {
        const alertText = await page.getByRole("alert").first().innerText().catch("");
        record.verdict = "BLOCKED";
        record.reason = alertText || "Play now never appeared (content stuck loading)";
        await page.screenshot({ path: join(HERE, `a3-r-${id}-00-loadfail.png`) }).catch(() => undefined);
        record.bodyText = (await page.locator("body").innerText().catch("")).slice(0, 600);
      } else {
        Object.assign(record, await playGame(page, `a3-r-${id}`, style));
        if (crashInfo.pageCrashed || crashInfo.disconnected) {
          record.verdict = "FAIL";
          record.reason = "Browser renderer crashed during gameplay";
        }
      }
    } catch (error) {
      record.verdict = "FAIL";
      record.reason = (crashInfo.pageCrashed || crashInfo.disconnected
        ? "Browser renderer crashed during gameplay. "
        : "") + String(error?.message ?? error).slice(0, 350);
      await page.screenshot({ path: join(HERE, `a3-r-${id}-00-error.png`) }).catch(() => undefined);
    }
  });
  record.durationMs = Date.now() - started;
  out.retests[id] = record;
  save();
  console.log(`[a3]  -> ${record.verdict} ${record.reason ?? ""} (${record.durationMs}ms)`);
}

/** Realm Carver: confirm scored-start guard, then exercise Practice tutorial. */
async function a3RealmCarver() {
  const out = results.passes.a3 ??= { retests: {}, challenge: null };
  if (out.retests["realm-carver"]) { console.log("[a3] skip realm-carver"); return; }
  console.log("[a3] realm-carver");
  const started = Date.now();
  const record = { id: "realm-carver", startedAt: new Date().toISOString() };
  await isolatedSession("qa-student-a3", async (page, crashInfo) => {
    try {
      await openGame(page, "realm-carver");
      const guard = page.getByText(/Game could not start/i).first();
      record.guardText = (await guard.innerText().catch("")).slice(0, 300);
      await page.screenshot({ path: join(HERE, "a3-r-realm-carver-01-briefing.png") });
      const playNow = page.getByRole("button", { name: /^Play now/i }).first();
      await playNow.click().catch(() => undefined);
      await page.waitForTimeout(8_000);
      record.canvasAfterPlayNow = await canvasStats(page, page.locator("[data-apk-canvas-host] canvas").first())
        .catch(() => ({ hasCanvas: false }));
      await page.screenshot({ path: join(HERE, "a3-r-realm-carver-02-after-play.png") });

      const practice = page.getByRole("button", { name: /^Practice$/i }).first();
      if (await practice.isVisible().catch(() => false)) {
        await practice.click();
        const tutorialCanvas = page.locator("[data-apk-canvas-host] canvas").first();
        await tutorialCanvas.waitFor({ state: "visible", timeout: 30_000 });
        await page.waitForTimeout(5_000);
        await page.screenshot({ path: join(HERE, "a3-r-realm-carver-03-practice.png") });
        record.tutorialStats = await canvasStats(page, tutorialCanvas);
        const box = await tutorialCanvas.boundingBox();
        for (let i = 0; i < 8 && box; i += 1) {
          await page.keyboard.press(GENERIC_KEYS[i % GENERIC_KEYS.length]);
          await page.mouse.click(box.x + box.width * (0.3 + 0.05 * i), box.y + box.height * 0.6);
          await page.waitForTimeout(500);
        }
        await page.waitForTimeout(2_000);
        await page.screenshot({ path: join(HERE, "a3-r-realm-carver-04-practice-play.png") });
      }
      if (crashInfo.pageCrashed || crashInfo.disconnected) throw new Error("renderer crashed");
      record.verdict = record.canvasAfterPlayNow?.readable ? "PASS" : "FAIL";
      record.reason = record.canvasAfterPlayNow?.readable
        ? undefined
        : `Scored Play now blocked by guard: ${record.guardText}`;
    } catch (error) {
      record.verdict = "FAIL";
      record.reason = String(error?.message ?? error).slice(0, 400);
    }
  });
  record.durationMs = Date.now() - started;
  out.retests["realm-carver"] = record;
  save();
  console.log(`[a3]  -> ${record.verdict} ${record.reason ?? ""} (${record.durationMs}ms)`);
}

/** Challenge flow: open the seeded challenge via Play challenge deep link. */
async function a3Challenge() {
  const out = results.passes.a3 ??= { retests: {}, challenge: null };
  if (out.challenge) { console.log("[a3] skip challenge"); return; }
  console.log("[a3] challenge flow");
  const started = Date.now();
  const record = { startedAt: new Date().toISOString() };
  await isolatedSession("qa-student-a3", async (page, crashInfo) => {
    try {
      await page.goto(`${BASE}/en/student/games`, { timeout: 150_000, waitUntil: "domcontentloaded" });
      const link = page.getByRole("link", { name: /Play challenge/i }).first();
      await link.waitFor({ state: "visible", timeout: 60_000 });
      record.href = await link.getAttribute("href");
      await link.click();
      await page.waitForURL(/challengeId=/, { timeout: 60_000 });
      const play = await playGame(page, "a3-challenge-wizard-vs-zombie", "generic");
      Object.assign(record, play);
      if (crashInfo.pageCrashed || crashInfo.disconnected) throw new Error("renderer crashed");
      record.verdict = play.verdict === "PASS" && (play.completionCalls?.length ?? 0) >= 1 ? "PASS"
        : play.verdict === "PASS" ? "PASS_NO_COMPLETION" : play.verdict;
    } catch (error) {
      record.verdict = "FAIL";
      record.reason = String(error?.message ?? error).slice(0, 400);
      await page.screenshot({ path: join(HERE, "a3-challenge-00-error.png") }).catch(() => undefined);
    }
  });
  record.durationMs = Date.now() - started;
  out.challenge = record;
  save();
  console.log(`[a3]  -> challenge ${record.verdict} (${record.durationMs}ms)`);
}

/** Runs one isolated b1 cross-school spot-check game. */
async function b1Game(id, idx) {
  const out = results.passes.b1 ??= { games: {} };
  if (out.games[id]) { console.log(`[b1] skip ${id}`); return; }
  console.log(`[b1] ${id}`);
  const started = Date.now();
  const record = { id, startedAt: new Date().toISOString() };
  await isolatedSession("qa-student-b1", async (page, crashInfo) => {
    try {
      const state = await openGame(page, id);
      if (crashInfo.pageCrashed || crashInfo.disconnected) throw new Error("renderer crashed during load");
      if (state !== "ready") {
        record.verdict = "BLOCKED";
        record.reason = await page.getByRole("alert").first().innerText().catch("") || "Play now never appeared";
        await page.screenshot({ path: join(HERE, `b1-${idx}-${id}-00-loadfail.png`) }).catch(() => undefined);
      } else {
        Object.assign(record, await playGame(page, `b1-${idx}-${id}`, "generic"));
        if (crashInfo.pageCrashed || crashInfo.disconnected) {
          record.verdict = "FAIL";
          record.reason = "Browser renderer crashed during gameplay";
        }
      }
    } catch (error) {
      record.verdict = "FAIL";
      record.reason = (crashInfo.pageCrashed || crashInfo.disconnected
        ? "Browser renderer crashed during gameplay. "
        : "") + String(error?.message ?? error).slice(0, 350);
      await page.screenshot({ path: join(HERE, `b1-${idx}-${id}-00-error.png`) }).catch(() => undefined);
    }
  });
  record.durationMs = Date.now() - started;
  out.games[id] = record;
  save();
  console.log(`[b1]  -> ${record.verdict} ${record.reason ?? ""} (${record.durationMs}ms)`);
}

await a3Catalog();
await a3Game("haunted-library", "generic");
await a3Game("gryphon-patrol", "generic");
await a3Game("rpg-battle", "rpg");
await a3Game("rune-match", "generic");
await a3RealmCarver();
await a3Challenge();
await b1Game("wizard-vs-zombie", "01");
await b1Game("castle-defense", "02");
save();
console.log("DONE");
