/**
 * T3 browser QA driver (pass 4) — focused follow-ups.
 * TEST-ONLY artifact.
 *  1. RPG Battle: click wrong answer options (options are pointer zones; digit
 *     keys feed the typed-translation buffer) until the defeat result saves.
 *  2. Abyssal Well: replay to a result screen and verify the completion save
 *     (pass 1 hit "Game progress could not be confirmed in time").
 * Writes into results-v2.json under passes.a3.focus.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const PASSWORD = "QaTest!2026x";
const resultsPath = join(HERE, "results-v2.json");
const results = JSON.parse(readFileSync(resultsPath, "utf8"));
results.passes.a3.focus ??= {};
function save() { writeFileSync(resultsPath, JSON.stringify(results, null, 2)); }

async function session(username, fn) {
  const browser = await chromium.launch({
    channel: "chrome", headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required",
      "--disable-dev-shm-usage", "--renderer-process-limit=1"],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    const login = await context.request.post(`${BASE}/api/auth/login`, {
      data: { username, password: PASSWORD }, timeout: 120_000,
    });
    if (login.status() !== 200) throw new Error(`login ${login.status()}`);
    const page = await context.newPage();
    page.setDefaultTimeout(120_000);
    const logs = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`${m.type()}: ${m.text().slice(0, 400)}`); });
    page.on("pageerror", (e) => logs.push(`pageerror: ${String(e).slice(0, 400)}`));
    await fn(page, logs);
    await context.close();
  } finally {
    await browser.close().catch(() => undefined);
  }
}

async function finishGame(page, rec, prefix, clickPoint, deadlineMs) {
  const completionCalls = [];
  const apiErrors = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/api/v1/apk/") && res.status() >= 400) {
      apiErrors.push({ url: url.replace(BASE, ""), status: res.status() });
    }
    if (url.endsWith("/api/v1/apk/complete") && res.request().method() === "POST") {
      let payload = null;
      try { payload = await res.json(); } catch { /* ignore */ }
      completionCalls.push({ status: res.status(), payload });
    }
  });

  await page.goto(`${BASE}/en/student/games/apk/${rec.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Play now/i }).first().click();
  const canvas = page.locator("[data-apk-canvas-host] canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(4_000);
  await page.screenshot({ path: join(HERE, `${prefix}-01-start.png`) });

  const result = page.locator("section[aria-label='Game result']").first();
  const started = Date.now();
  let clicks = 0;
  while (Date.now() - started < deadlineMs) {
    if (await result.isVisible().catch(() => false)) break;
    const box = await canvas.boundingBox();
    const p = clickPoint(clicks);
    await page.mouse.click(box.x + box.width * p.x, box.y + box.height * p.y);
    clicks += 1;
    await page.waitForTimeout(1_700);
  }
  rec.reachedResult = await result.isVisible().catch(() => false);
  rec.clicks = clicks;
  await page.waitForTimeout(1_500);
  await page.screenshot({ path: join(HERE, `${prefix}-02-result.png`) });
  rec.resultText = (await result.innerText().catch("")).slice(0, 400);

  // Observe the save: up to 25s for the complete POST and confirmation UI.
  const saveStart = Date.now();
  while (Date.now() - saveStart < 25_000) {
    if (completionCalls.length > 0) break;
    const saving = await page.getByText(/Saving progress|could not be confirmed/i).first()
      .isVisible().catch(() => false);
    if (!saving && rec.reachedResult && Date.now() - saveStart > 6_000) break;
    await page.waitForTimeout(1_000);
  }
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: join(HERE, `${prefix}-03-saved.png`) });
  rec.completionCalls = completionCalls;
  rec.apiErrors = apiErrors;
  rec.bodyTail = (await page.locator("section[aria-label='Game result']").innerText().catch("")).slice(0, 400);
}

// --- RPG Battle: force defeat through wrong option clicks ------------------
try {
  console.log("[a3] rpg-battle click-defeat");
  const rec = { id: "rpg-battle" };
  await session("qa-student-a3", async (page, logs) => {
    rec.logs = logs;
    // Alternate the option-3 and option-2 pointer zones (always wrong).
    await finishGame(page, rec, "a3-r3-rpg-battle",
      (n) => (n % 2 === 0 ? { x: 0.85, y: 0.85 } : { x: 0.85, y: 0.76 }),
      120_000);
  });
  rec.verdict = rec.reachedResult ? "PASS" : "FAIL";
  results.passes.a3.focus["rpg-battle-defeat-v2"] = rec;
  save();
  console.log(`[a3]  -> rpg defeat ${rec.verdict} reached=${rec.reachedResult} comps=${rec.completionCalls.length}`);
} catch (error) {
  console.log(`[a3]  -> rpg defeat ERROR ${String(error?.message ?? error).slice(0, 200)}`);
}

// --- Abyssal Well: completion save retry ------------------------------------
try {
  console.log("[a3] abyssal-well save retry");
  const rec = { id: "abyssal-well" };
  await session("qa-student-a3", async (page, logs) => {
    rec.logs = logs;
    await finishGame(page, rec, "a3-r3-abyssal-well",
      (n) => ({ x: 0.2 + 0.12 * (n % 6), y: 0.55 }),
      90_000);
  });
  rec.verdict = rec.reachedResult && rec.completionCalls.some((c) => c.status === 200) ? "PASS"
    : rec.reachedResult ? "FAIL_SAVE" : "FAIL_NO_RESULT";
  results.passes.a3.focus["abyssal-well-retry"] = rec;
  save();
  console.log(`[a3]  -> abyssal ${rec.verdict} reached=${rec.reachedResult} comps=${rec.completionCalls.length}`);
} catch (error) {
  console.log(`[a3]  -> abyssal ERROR ${String(error?.message ?? error).slice(0, 200)}`);
}
console.log("DONE");
