#!/usr/bin/env node
/**
 * Plays every 3D game in headless Chromium (software GL) from the packaged code and assets:
 * syncs the assets into qc/public, starts Vite, opens each game, starts it from the briefing,
 * waits, screenshots, and reports the model requests, console errors, and diagnostics.
 *
 *   node qc/run.mjs [game ...] [--2d] [--shots <dir>]
 *   QC_CHROMIUM=/path/to/chrome  use a Chromium that does not match the installed Playwright
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flat = args.includes("--2d");
const shotsAt = args.indexOf("--shots");
const shots = shotsAt >= 0 ? args[shotsAt + 1] : join(here, "shots");
const ALL = ["monster-encounters", "rune-match", "labyrinth", "potion-rush", "dragon-flight", "dungeon-liberator", "devourer-slime", "hero-vs-zombie", "rpg-battle", "paladins-twin-soul", "village-guardian", "archers-revenge", "astral-mage", "spellweavers-run", "haunted-library", "shadow-gate-dungeon", "realm-carver", "alchemists-synthesis", "enchanted-library", "gryphon-patrol", "magic-defense", "griffin-sky-joust", "abyssal-well", "rune-forge-chamber", "dragon-rider", "griffin-riders-escape", "castle-defense"];
const games = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--shots");
mkdirSync(shots, { recursive: true });
execFileSync("node", [join(here, "..", "scripts", "sync-assets.mjs"), join(here, "public")], { stdio: "inherit" });

const server = await createServer({ configFile: join(here, "vite.config.ts"), logLevel: "error", server: { port: 5600 + Math.floor(Math.random() * 200) } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ ...(process.env.QC_CHROMIUM ? { executablePath: process.env.QC_CHROMIUM } : {}), args: ["--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] });
let failed = 0;
for (const game of games.length ? games : ALL) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(120_000);
  const requests = [];
  const errors = [];
  page.on("request", (r) => /\/(packs|models)\//.test(r.url()) && requests.push(r.url().replace(url, "")));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  let note = "";
  try {
    await page.goto(`${url}?game=${game}${flat ? "&renderer=phaser" : ""}`);
    await page.waitForFunction(() => window.__qc?.ready === true);
    await page.waitForSelector(".briefing [data-start]");
    await page.screenshot({ path: join(shots, `${game}${flat ? "-2d" : ""}-briefing.png`) });
    await page.click("[data-start]");
    await page.waitForSelector(".apk3d-play.on canvas, .apk3d-play.on .apk3d-layer", { timeout: 120_000 });
    await page.waitForTimeout(15_000);
    await page.screenshot({ path: join(shots, `${game}${flat ? "-2d" : ""}-play.png`) });
  } catch (err) {
    note = ` FAILED: ${String(err).split("\n")[0]}`;
    await page.screenshot({ path: join(shots, `${game}${flat ? "-2d" : ""}-failed.png`) }).catch(() => undefined);
  }
  const diagnostics = await page.evaluate(() => (window.__qc?.session?.diagnostics ?? []).filter((d) => d.level === "error")).catch(() => []);
  const legacy = requests.filter((r) => r.startsWith("models/"));
  const bad = note || errors.length || diagnostics.length || (!flat && legacy.length);
  if (bad) failed++;
  console.log(`${bad ? "FAIL" : "ok  "} ${game}${flat ? " (2D)" : ""}: ${requests.length} pack requests, legacy ${legacy.length}, errors ${errors.length ? errors.join(" | ") : "none"}, diagnostics ${diagnostics.length ? JSON.stringify(diagnostics) : "none"}${note}`);
  await page.close();
}
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
