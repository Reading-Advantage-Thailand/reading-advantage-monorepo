/**
 * T3 browser QA driver (pass 3) — focused follow-ups.
 * TEST-ONLY artifact.
 *  1. Realm Carver: click Play now (100-word guard fires on runtime build),
 *     capture the guard, then exercise the Practice tutorial canvas.
 *  2. RPG Battle: deliberately answer incorrectly to force the defeat result
 *     screen and capture the saved completion.
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

async function canvasStats(page, canvas) {
  const box = await canvas.boundingBox().catch(() => null);
  if (!box) return { readable: false };
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height }, timeout: 4_000 });
  return page.evaluate((b64) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 64; c.height = 36;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 64, 36);
      const d = ctx.getImageData(0, 0, 64, 36).data;
      const colors = new Set();
      for (let i = 0; i < d.length; i += 4) colors.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
      resolve({ readable: true, uniqueColors: colors.size });
    };
    img.onerror = () => resolve({ readable: false });
    img.src = `data:image/png;base64,${b64}`;
  }), shot.toString("base64"));
}

// --- Realm Carver -----------------------------------------------------------
if (!results.passes.a3.focus["realm-carver"]) {
  console.log("[a3] realm-carver");
  const rec = {};
  try {
  await session("qa-student-a3", async (page, logs) => {
    rec.logs = logs;
    await page.goto(`${BASE}/en/student/games/apk/realm-carver`, { waitUntil: "domcontentloaded" });
    const playNow = page.getByRole("button", { name: /^Play now/i }).first();
    await playNow.waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForTimeout(3_000);
    await page.screenshot({ path: join(HERE, "a3-r2-realm-carver-01-briefing.png") });

    await playNow.click();
    const alertBox = page.getByRole("alert").filter({ hasText: /Game could not start/i }).first();
    rec.guardAfterPlay = (await alertBox.innerText({ timeout: 20_000 }).catch(() => "")).slice(0, 300);
    await page.waitForTimeout(2_000);
    rec.scoredCanvasStats = await canvasStats(page, page.locator("[data-apk-canvas-host] canvas").first());
    rec.canvasVisibleAfterPlay = await page.locator("[data-apk-canvas-host] canvas").first()
      .isVisible().catch(() => false);
    await page.screenshot({ path: join(HERE, "a3-r2-realm-carver-02-after-play.png") });

    const practice = page.getByRole("button", { name: /^Practice$/i }).first();
    if (await practice.isVisible().catch(() => false)) {
      await practice.click();
      await page.waitForTimeout(12_000);
      await page.screenshot({ path: join(HERE, "a3-r2-realm-carver-03-after-practice.png") });
      const tc = page.locator("[data-apk-canvas-host] canvas").first();
      rec.tutorialCanvasVisible = await tc.isVisible().catch(() => false);
      if (rec.tutorialCanvasVisible) {
        rec.tutorialStats = await canvasStats(page, tc);
        const box = await tc.boundingBox();
        for (let i = 0; i < 10 && box; i += 1) {
          await page.keyboard.press(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"][i % 4]);
          await page.mouse.click(box.x + box.width * (0.25 + 0.05 * (i % 8)), box.y + box.height * 0.6);
          await page.waitForTimeout(500);
        }
        await page.waitForTimeout(1_500);
        await page.screenshot({ path: join(HERE, "a3-r2-realm-carver-04-practice-play.png") });
      } else {
        rec.tutorialAlerts = (await page.getByRole("alert").allInnerTexts().catch(() => [])).join(" | ").slice(0, 400);
        rec.tutorialStatus = (await page.locator("[data-apk-shell-status='true']").innerText().catch("")).slice(0, 200);
      }
    }
  });
  } catch (error) {
    rec.verdict = "FAIL";
    rec.error = String(error?.message ?? error).slice(0, 300);
    console.log(`[a3]  -> realm-carver error: ${rec.error}`);
  }
  results.passes.a3.focus["realm-carver"] = rec;
  save();
  console.log(`[a3]  -> ${rec.verdict} guard="${(rec.guardAfterPlay || "").slice(0, 100)}" tutorial=${rec.tutorialCanvasVisible}`);
}

// --- RPG Battle defeat ------------------------------------------------------
if (!results.passes.a3.focus["rpg-battle-defeat"]) {
  console.log("[a3] rpg-battle defeat run");
  const rec = {};
  try {
  await session("qa-student-a3", async (page, logs) => {
    rec.logs = logs;
    const completionCalls = [];
    page.on("response", async (res) => {
      if (res.url().endsWith("/api/v1/apk/complete") && res.request().method() === "POST") {
        let payload = null;
        try { payload = await res.json(); } catch { /* ignore */ }
        completionCalls.push({ status: res.status(), payload });
      }
    });
    await page.goto(`${BASE}/en/student/games/apk/rpg-battle`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Play now/i }).first().click();
    const canvas = page.locator("[data-apk-canvas-host] canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(4_000);
    await page.screenshot({ path: join(HERE, "a3-r2-rpg-battle-01-start.png") });

    // Answer every prompt with a wrong option (2 or 3) until the result screen.
    const result = page.locator("section[aria-label='Game result']").first();
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press(i % 2 === 0 ? "2" : "3");
      await page.waitForTimeout(1_400);
      if (await result.isVisible().catch(() => false)) break;
    }
    await page.waitForTimeout(1_500);
    await page.screenshot({ path: join(HERE, "a3-r2-rpg-battle-02-defeat.png") });
    rec.resultVisible = await result.isVisible().catch(() => false);
    rec.resultText = (await result.innerText().catch("")).slice(0, 400);
    const saveDeadline = Date.now() + 12_000;
    while (Date.now() < saveDeadline) {
      if (completionCalls.length > 0) break;
      await page.waitForTimeout(1_000);
    }
    await page.screenshot({ path: join(HERE, "a3-r2-rpg-battle-03-saved.png") });
    rec.completionCalls = completionCalls;
  });
  } catch (error) {
    rec.verdict = "FAIL";
    rec.error = String(error?.message ?? error).slice(0, 300);
  }
  if (!rec.verdict) rec.verdict = rec.resultVisible ? "PASS" : "FAIL";
  results.passes.a3.focus["rpg-battle-defeat"] = rec;
  save();
  console.log(`[a3]  -> rpg defeat ${rec.verdict} comps=${rec.completionCalls?.length ?? 0}`);
}

console.log("DONE");
