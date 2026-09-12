import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = path.join(
  root,
  "measure/tracks/apk_product_simplification_20260820/evidence/catalog-load-review",
);
const baseURL = process.env.CATALOG_LOAD_BASE_URL ?? "http://localhost:3018";
const chromePath = process.env.PLAYWRIGHT_CHROME_PATH ?? "/usr/bin/google-chrome";

const GAMES = [
  { id: "castle-defense", title: "Castle Defense" },
  { id: "dragon-rider", title: "Dragon Rider" },
  { id: "magic-defense", title: "Magic Defense" },
  { id: "rpg-battle", title: "RPG Battle" },
  { id: "dragon-flight", title: "Dragon Flight" },
  { id: "wizard-vs-zombie", title: "Wizard vs Zombie" },
  { id: "enchanted-library", title: "Enchanted Library" },
  { id: "rune-match", title: "Rune Match" },
  { id: "alchemists-synthesis", title: "Alchemist's Synthesis" },
  { id: "potion-rush", title: "Potion Rush" },
  { id: "dungeon-liberator", title: "Dungeon Liberator" },
  { id: "spellweavers-run", title: "Spellweaver's Run" },
  { id: "shadow-gate-dungeon", title: "Shadow Gate Dungeon" },
  { id: "rune-forge-chamber", title: "Rune Forge Chamber" },
  { id: "village-guardian", title: "Village Guardian" },
  { id: "labyrinth-goblin-king", title: "Labyrinth of the Goblin King" },
  { id: "abyssal-well", title: "The Abyssal Well" },
  { id: "archers-revenge", title: "Archer's Revenge" },
  { id: "storm-castle-tower", title: "Storm the Castle Tower" },
  { id: "griffin-sky-joust", title: "Griffin Sky-Joust" },
  { id: "realm-carver", title: "Realm Carver" },
  { id: "paladins-twin-soul", title: "Paladin's Twin-Soul" },
  { id: "griffin-riders-escape", title: "Griffin Rider's Escape" },
  { id: "astral-mage", title: "Astral Mage" },
  { id: "devourer-slime", title: "Devourer Slime" },
  { id: "sorcerer-ziggurat", title: "The Sorcerer's Ziggurat" },
  { id: "haunted-library", title: "The Haunted Library" },
  { id: "gryphon-patrol", title: "Gryphon Patrol" },
];

/**
 * Clicks the first visible briefing start control.
 * @param page Playwright page.
 * @returns True when a start control was clicked.
 */
async function startFromBriefing(page) {
  const start = page.getByRole("button", { name: /start guided tutorial|start game|begin quest/i }).first();
  try {
    await start.waitFor({ state: "visible", timeout: 25000 });
    await start.click({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Skips the guided tutorial when the skip control is present.
 * @param page Playwright page.
 * @returns True when skip was clicked.
 */
async function skipTutorial(page) {
  const skip = page.getByRole("button", { name: "Skip tutorial" });
  try {
    await skip.waitFor({ state: "visible", timeout: 8000 });
    await skip.click({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Captures one catalog title after briefing and tutorial are dismissed.
 * @param page Playwright page.
 * @param game Catalog title metadata.
 * @returns Capture result for the HTML report.
 */
async function captureGame(page, game) {
  const pageErrors = [];
  const onError = (error) => pageErrors.push(String(error.message ?? error));
  page.on("pageerror", onError);
  const started = Date.now();
  const result = {
    id: game.id,
    title: game.title,
    url: `${baseURL}/en/student/arcade/${game.id}`,
    startedBriefing: false,
    skippedTutorial: false,
    canvasCount: 0,
    canvasVisible: false,
    canvasWidth: 0,
    canvasHeight: 0,
    alert: "",
    statusText: "",
    pageErrors,
    error: "",
    elapsedMs: 0,
    fullShot: `${game.id}-full.jpg`,
    canvasShot: `${game.id}-canvas.jpg`,
  };
  try {
    await page.goto(`/en/student/arcade/${game.id}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    result.startedBriefing = await startFromBriefing(page);
    result.skippedTutorial = await skipTutorial(page);
    const canvas = page.locator("[data-apk-canvas-host] canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(1800);
    const box = await canvas.boundingBox();
    result.canvasCount = await page.locator("[data-apk-canvas-host] canvas").count();
    result.canvasVisible = Boolean(box && box.width > 32 && box.height > 32);
    result.canvasWidth = Math.round(box?.width ?? 0);
    result.canvasHeight = Math.round(box?.height ?? 0);
    result.alert = ((await page.getByRole("alert").textContent().catch(() => "")) ?? "").trim();
    result.statusText = ((await page.locator("[aria-live='polite']").first().textContent().catch(() => "")) ?? "").trim();
    await page.screenshot({
      path: path.join(outDir, result.fullShot),
      type: "jpeg",
      quality: 55,
    });
    await page.locator("[data-apk-canvas-host]").screenshot({
      path: path.join(outDir, result.canvasShot),
      type: "jpeg",
      quality: 55,
    });
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    await page.screenshot({
      path: path.join(outDir, result.fullShot),
      type: "jpeg",
      quality: 45,
    }).catch(() => undefined);
  } finally {
    page.off("pageerror", onError);
    result.elapsedMs = Date.now() - started;
  }
  return result;
}

/**
 * Writes the review HTML page from capture results.
 * @param results Per-title capture records.
 * @returns Nothing. Writes index.html into the evidence directory.
 */
function writeReport(results) {
  const loaded = results.filter((item) => item.canvasVisible && !item.error).length;
  const failed = results.length - loaded;
  const rows = results.map((item) => {
    const status = item.canvasVisible && !item.error ? "loaded" : "failed";
    const error = item.error || item.alert || (item.pageErrors[0] ?? "");
    return `<article class="card ${status}" id="${item.id}">
  <header>
    <h2>${item.title}</h2>
    <p class="meta"><a href="${item.url}">${item.id}</a> · ${status} · canvas ${item.canvasWidth}×${item.canvasHeight} · ${item.elapsedMs}ms</p>
    ${error ? `<p class="error">${error}</p>` : ""}
    <p class="meta">briefing start: ${item.startedBriefing ? "yes" : "no"} · skip tutorial: ${item.skippedTutorial ? "yes" : "no"} · canvases: ${item.canvasCount} · status: ${item.statusText || "none"}</p>
  </header>
  <div class="shots">
    <figure><img src="${item.fullShot}" alt="${item.title} full page"><figcaption>Full page</figcaption></figure>
    <figure><img src="${item.canvasShot}" alt="${item.title} canvas"><figcaption>Canvas host</figcaption></figure>
  </div>
</article>`;
  }).join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>APK catalog load review</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0b1220; color: #e8eef7; }
    main { max-width: 1400px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; }
    .summary { margin: 0 0 24px; color: #9db0c8; }
    .card { border: 1px solid #243044; border-radius: 12px; padding: 16px; margin: 0 0 20px; background: #121a2a; }
    .card.failed { border-color: #b54747; }
    .card.loaded { border-color: #2f6f4a; }
    .meta { color: #9db0c8; font-size: 14px; }
    .error { color: #ffb4b4; }
    .shots { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    img { width: 100%; border-radius: 8px; background: #000; }
    figcaption { color: #9db0c8; font-size: 13px; }
    a { color: #8ec5ff; }
    @media (max-width: 900px) { .shots { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>APK catalog load review</h1>
    <p class="summary">${loaded} loaded, ${failed} failed, ${results.length} titles. Public arcade at ${baseURL}/en/student/arcade/{id}. Tutorial skipped. Canvas host captured after Phaser mount.</p>
    ${rows}
  </main>
</body>
</html>`;
  writeFileSync(path.join(outDir, "index.html"), html);
  writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  baseURL,
});
mkdirSync(outDir, { recursive: true });
const results = [];
for (const game of GAMES) {
  process.stderr.write(`capturing ${game.id}\n`);
  results.push(await captureGame(page, game));
}
writeReport(results);
await browser.close();
process.stdout.write(`${outDir}/index.html\n`);
