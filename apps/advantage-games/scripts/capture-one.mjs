import { chromium } from "playwright";

const gameId = process.argv[2];
if (!gameId) { console.error("usage: node capture-one.mjs <game-id>"); process.exit(1); }
const outDir = "/home/daniebo/Desktop/reading-advantage-monorepo/measure/tracks/apk_product_simplification_20260820/evidence/catalog-load-review";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(`http://localhost:3000/en/student/arcade/${gameId}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const demo = page.getByRole("button", { name: /demonstrate|demo/i }).first();
  try { await demo.waitFor({ state: "visible", timeout: 8000 }); await demo.click({ timeout: 5000 }); } catch { console.info("Demo control was unavailable."); }
  const start = page.getByRole("button", { name: /start guided tutorial|start game|begin quest/i }).first();
  try { await start.waitFor({ state: "visible", timeout: 25000 }); await start.click({ timeout: 5000 }); } catch { console.info("Start control was unavailable."); }
  const skip = page.getByRole("button", { name: /skip tutorial/i }).first();
  try { await skip.waitFor({ state: "visible", timeout: 8000 }); await skip.click({ timeout: 5000 }); } catch { console.info("Skip control was unavailable."); }
  const canvas = page.locator("[data-apk-canvas-host] canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/${gameId}-full.jpg`, type: "jpeg", quality: 55 });
  await page.locator("[data-apk-canvas-host]").screenshot({ path: `${outDir}/${gameId}-canvas.jpg`, type: "jpeg", quality: 55 });
  console.log("captured", gameId);
} catch (e) {
  console.error("CAPTURE ERROR", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
