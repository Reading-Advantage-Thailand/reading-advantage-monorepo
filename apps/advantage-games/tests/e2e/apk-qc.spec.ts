import { expect, test, type Page } from "@playwright/test";
import { createGateRunnerState } from "@reading-advantage/game-cartridges/gate-runner";
import {
  attemptZigguratStep,
  createZigguratState,
  getCorrectAdjacentNode,
} from "@reading-advantage/game-cartridges";

interface CanvasTouchSurface {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function getCanvasTouchSurface(page: Page): Promise<CanvasTouchSurface> {
  const canvas = page.locator("[data-apk-canvas-host] canvas");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("APK canvas has no mobile touch bounds");
  return bounds;
}

async function tapLogicalCanvas(
  page: Page,
  bounds: CanvasTouchSurface,
  x: number,
  y: number,
): Promise<void> {
  await page.touchscreen.tap(
    bounds.x + (x / 960) * bounds.width,
    bounds.y + (y / 540) * bounds.height,
  );
}

async function waitForCartridgeScene(page: Page): Promise<void> {
  await expect(
    page.getByTestId("diagnostic-log").locator("p", { hasText: "CARTRIDGE_SCENE_READY" }).first(),
  ).toBeVisible({ timeout: 30_000 });
}

test.describe.configure({ mode: "serial" });

test.describe("APK quality-control lab", () => {
  test("loads a Phaser cartridge and swaps editions without copied game routes", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/qc");

    await expect(page.getByRole("heading", { name: "Cartridge proving ground" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Dragon Flight/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1, { timeout: 30_000 });

    for (const game of [
      { title: "Dragon Flight", id: "dragon-flight", input: "vocabulary" },
      { title: "Dungeon Liberator", id: "dungeon-liberator", input: "sentence" },
      { title: "Magic Defense", id: "magic-defense", input: "vocabulary" },
      { title: "Astral Mage", id: "astral-mage", input: "sentence" },
      { title: "The Sorcerer's Ziggurat", id: "sorcerer-ziggurat", input: "sentence" },
    ]) {
      await page.getByRole("button", { name: new RegExp(game.title) }).click();
      await expect(page.getByText(`${game.id} · ${game.input}`, { exact: true })).toBeVisible();
      for (const edition of ["Primary Chibi", "Secondary Epic"]) {
        await page.getByRole("button", { name: edition }).click();
        await expect(page.getByRole("button", { name: edition })).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1);
      }
    }
    await expect(page.getByText(/Nothing is authenticated or persisted/)).toBeVisible();
    await page.screenshot({ path: "/tmp/apk-qc-desktop.png", fullPage: true });
  });

  test("keeps controls and diagnostics available at the mobile reference size", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    await expect(page.getByLabel("Content fixture")).toBeVisible();
    await expect(page.getByLabel("Difficulty seed")).toBeVisible();
    await expect(page.getByText("Game ready", { exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForCartridgeScene(page);
    await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Pause game" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Mute game" })).toBeVisible();
    await expect(page.getByTestId("diagnostic-log")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.getByRole("region", { name: "Cartridge launch surface" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/apk-qc-mobile.png", fullPage: false });
  });

  test("emits the stable result and mock host mapping after real Phaser input", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/qc");
    await expect(page.getByText("Game ready", { exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForCartridgeScene(page);

    const model = createGateRunnerState(
      [
        { term: "journey", translation: "voyage" },
        { term: "bridge", translation: "pont" },
        { term: "forest", translation: "forêt" },
        { term: "lantern", translation: "lanterne" },
      ],
      29,
    );
    for (const round of model.rounds) {
      await page.keyboard.press(round.correctOptionIndex === 0 ? "ArrowLeft" : "ArrowRight");
    }

    await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Game result")).toContainText("Accuracy: 100%");
    await expect(page.getByText(/"gameType": "dragon-flight"/)).toBeVisible();
  });

  test("completes Astral Mage through Phaser keyboard targeting", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/qc?cartridge=astral-mage");
    await expect(page.getByRole("button", { name: /Astral Mage/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("Game ready", { exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForCartridgeScene(page);

    const sentenceTokenCount = 13;
    const correctEvents = page
      .getByTestId("diagnostic-log")
      .locator("p", { hasText: "CARTRIDGE_ANSWER correct target" });
    for (let index = 0; index < sentenceTokenCount; index += 1) {
      await page.keyboard.press("Space");
      await expect(correctEvents).toHaveCount(index + 1, { timeout: 5_000 });
    }

    await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Game result")).toContainText("Accuracy: 100%");
    await expect(page.getByText(/"gameType": "astral-mage"/)).toBeVisible();
  });

  test("completes Sorcerer's Ziggurat through adjacent keyboard steps", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/qc?cartridge=sorcerer-ziggurat");
    await expect(
      page.getByRole("button", { name: /The Sorcerer's Ziggurat/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Game ready", { exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForCartridgeScene(page);

    let state = createZigguratState(
      [
        { term: "The curious fox crossed the quiet bridge", translation: "Narrative sentence" },
        { term: "We practice new words every morning", translation: "Habit sentence" },
      ],
      29,
    );
    while (!state.complete) {
      const next = getCorrectAdjacentNode(state);
      const key = next.direction === "left"
        ? "ArrowLeft"
        : next.direction === "right"
          ? "ArrowRight"
          : "ArrowUp";
      await page.keyboard.press(key);
      await page.waitForTimeout(700);
      state = attemptZigguratStep(state, next.id);
    }

    await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Game result")).toContainText("Accuracy: 100%");
    await expect(page.getByText(/"gameType": "sorcerer-ziggurat"/)).toBeVisible();
  });
});

test.describe("APK mobile touch completion", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("completes both new cartridges through visible Phaser touch controls", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/qc?cartridge=astral-mage");
    await expect(page.getByText("Game ready", { exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForCartridgeScene(page);

    const astralAnswers = page
      .getByTestId("diagnostic-log")
      .locator("p", { hasText: "CARTRIDGE_ANSWER correct target" });
    const astralSurface = await getCanvasTouchSurface(page);
    for (let index = 0; index < 13; index += 1) {
      await tapLogicalCanvas(page, astralSurface, 860, 450);
      await expect(astralAnswers).toHaveCount(index + 1, { timeout: 5_000 });
    }
    await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
    await expect(page.getByText(/"gameType": "astral-mage"/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await page.getByRole("button", { name: /The Sorcerer's Ziggurat/ }).click();
    await expect(page.getByText("Game complete", { exact: true })).toBeHidden();
    await expect(page.getByText("Game ready", { exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForCartridgeScene(page);
    const zigguratSurface = await getCanvasTouchSurface(page);
    let state = createZigguratState(
      [
        { term: "The curious fox crossed the quiet bridge", translation: "Narrative sentence" },
        { term: "We practice new words every morning", translation: "Habit sentence" },
      ],
      29,
    );
    while (!state.complete) {
      const next = getCorrectAdjacentNode(state);
      const x = next.direction === "left" ? 380 : next.direction === "right" ? 580 : 480;
      await tapLogicalCanvas(page, zigguratSurface, x, 480);
      await page.waitForTimeout(700);
      state = attemptZigguratStep(state, next.id);
    }

    await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Game result")).toContainText("Accuracy: 100%");
    await expect(page.getByText(/"gameType": "sorcerer-ziggurat"/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
