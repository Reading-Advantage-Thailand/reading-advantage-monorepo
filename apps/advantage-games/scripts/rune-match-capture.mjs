import { chromium } from "playwright";

const chromePath = "/usr/bin/google-chrome";
const url = "http://localhost:3000/en/student/arcade/rune-match";
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  const start = page.getByRole("button", { name: /start guided tutorial|start game|begin quest/i }).first();
  try {
    await start.waitFor({ state: "visible", timeout: 25000 });
    await start.click({ timeout: 5000 });
  } catch { console.info("Start control was unavailable."); }
  const skip = page.getByRole("button", { name: "Skip tutorial" });
  try {
    await skip.waitFor({ state: "visible", timeout: 8000 });
    await skip.click({ timeout: 5000 });
  } catch { console.info("Skip control was unavailable."); }
  const canvas = page.locator("[data-apk-canvas-host] canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: process.argv[2] ?? "/tmp/opencode/rune-match-before.jpg", type: "jpeg", quality: 70 });
  await page.locator("[data-apk-canvas-host]").screenshot({ path: process.argv[3] ?? "/tmp/opencode/rune-match-before-canvas.jpg", type: "jpeg", quality: 70 });
  console.log("CAPTURE OK");
} catch (e) {
  console.error("CAPTURE ERROR", e.message);
  await page.screenshot({ path: process.argv[2] ?? "/tmp/opencode/rune-match-before.jpg", type: "jpeg", quality: 40 }).catch(() => undefined);
} finally {
  await browser.close();
}
