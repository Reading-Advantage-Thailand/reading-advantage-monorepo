import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3320/en/student/arcade";
const EVIDENCE_ROOT = resolve(
  "measure/tracks/apk_legacy_catalog_manual_browser_evidence_20260819/evidence",
);

const cartridges = [
  ["castle-defense", "Castle Defense", ["ArrowRight", "Space"]],
  ["magic-defense", "Magic Defense", ["s"]],
  ["rpg-battle", "RPG Battle", ["k"]],
  ["wizard-vs-zombie", "Wizard vs Zombie", ["x"]],
  ["enchanted-library", "Enchanted Library", ["a", "Space"]],
  ["rune-match", "Rune Match", ["d", "Enter"]],
  ["alchemists-synthesis", "Alchemist's Synthesis", ["ArrowRight", "Enter"]],
  ["potion-rush", "Potion Rush", ["ArrowRight", "Space"]],
  ["dungeon-liberator", "Dungeon Liberator", ["ArrowRight"]],
  ["rune-forge-chamber", "Rune Forge Chamber", ["ArrowRight", "Enter"]],
  ["village-guardian", "Village Guardian", ["ArrowRight"]],
  ["abyssal-well", "The Abyssal Well", ["ArrowRight", "Space"]],
  ["archers-revenge", "Archer's Revenge", ["ArrowRight", "Space"]],
  ["storm-castle-tower", "Storm the Castle Tower", ["ArrowRight"]],
  ["griffin-sky-joust", "Griffin Sky-Joust", ["ArrowRight", "Space"]],
  ["realm-carver", "Realm Carver", ["ArrowRight"]],
  ["paladins-twin-soul", "Paladin's Twin-Soul", ["ArrowRight", "Space"]],
  ["devourer-slime", "Devourer Slime", ["ArrowRight"]],
  ["haunted-library", "The Haunted Library", ["ArrowRight"]],
  ["gryphon-patrol", "Gryphon Patrol", ["ArrowRight", "Space"]],
];

const viewports = [
  ["compact", { width: 390, height: 844 }],
  ["wide", { width: 1440, height: 900 }],
];

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});

const observations = [];

try {
  for (const [profile, viewport] of viewports) {
    await mkdir(resolve(EVIDENCE_ROOT, profile), { recursive: true });
    const context = await browser.newContext({ viewport });

    for (const [id, title, keys] of cartridges) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.goto(`${BASE_URL}/${id}`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Start (?:game|guided tutorial)/u }).click();
      await page.getByRole("button", { name: "Skip tutorial" }).click();
      const canvas = page.locator("[data-apk-canvas-host] canvas");
      await canvas.waitFor({ state: "visible" });
      await canvas.click({ position: { x: 20, y: 20 } });
      for (const key of keys) await page.keyboard.press(key);
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => ({
        canvasCount: document.querySelectorAll("[data-apk-canvas-host] canvas").length,
        documentWidth: document.documentElement.scrollWidth,
        errorText: [...document.querySelectorAll('[role="alert"]')]
          .map((element) => element.textContent?.trim())
          .filter(Boolean),
        heading: document.querySelector("h1")?.textContent?.trim(),
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }));

      const screenshot = resolve(EVIDENCE_ROOT, profile, `${id}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      observations.push({
        id,
        title,
        profile,
        screenshot,
        keys,
        consoleErrors,
        ...state,
      });
      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  resolve(EVIDENCE_ROOT, "capture-observations.json"),
  `${JSON.stringify(observations, null, 2)}\n`,
  "utf8",
);
