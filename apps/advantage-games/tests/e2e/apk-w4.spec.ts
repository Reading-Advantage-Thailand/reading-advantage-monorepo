import { expect, test, type Page } from "@playwright/test";

const games = [
  { id: "archers-revenge", title: "Archer's Revenge", attempts: 4, target: [280, 245] },
  { id: "paladins-twin-soul", title: "Paladin's Twin-Soul", attempts: 4, target: [280, 245] },
  { id: "griffin-sky-joust", title: "Griffin Sky-Joust", attempts: 13, target: [575, 180] },
  { id: "gryphon-patrol", title: "Gryphon Patrol", attempts: 13, target: [210, 180] },
  { id: "realm-carver", title: "Realm Carver", attempts: 13, target: [335, 225] },
] as const;

async function waitForArena(page: Page): Promise<void> {
  await expect(page.getByTestId("diagnostic-log").locator("p", { hasText: "ARENA_SCENE_READY" }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1);
}

test.describe.configure({ mode: "serial" });

test.describe("APK W4 arena wave desktop", () => {
  test("penalizes a wrong aimed shot and emits exactly five result fields", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/qc?cartridge=archers-revenge");
    await waitForArena(page);
    const resolved = page.getByTestId("diagnostic-log").locator("p", { hasText: "ARENA_TARGET_RESOLVED" });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");
    await expect(resolved).toHaveCount(1);
    await page.keyboard.press("ArrowLeft");
    for (let index = 0; index < 4; index += 1) {
      await page.keyboard.press("Space");
      await expect(resolved).toHaveCount(index + 2);
    }
    await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
    const result = JSON.parse(await page.getByRole("heading", { name: "Stable result ABI" }).locator("..").locator("pre").textContent() ?? "{}");
    expect(Object.keys(result).sort()).toEqual(["accuracy", "correctAnswers", "score", "totalAttempts", "xp"]);
    expect(result).toMatchObject({ accuracy: 0.8, correctAnswers: 4, totalAttempts: 5 });
  });

  test("emits a loss exactly once after protected-target health is depleted", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/qc?cartridge=archers-revenge");
    await waitForArena(page);
    const resolved = page.getByTestId("diagnostic-log").locator("p", { hasText: "ARENA_TARGET_RESOLVED" });
    await page.keyboard.press("ArrowRight");
    for (let index = 0; index < 3; index += 1) {
      await page.keyboard.press("Space");
      await expect(resolved).toHaveCount(index + 1);
    }
    await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(resolved).toHaveCount(3);
    const result = JSON.parse(await page.getByRole("heading", { name: "Stable result ABI" }).locator("..").locator("pre").textContent() ?? "{}");
    expect(result).toMatchObject({ accuracy: 0, correctAnswers: 0, score: 0, totalAttempts: 3, xp: 0 });
  });

  test("resolves a held pointer release once and ignores pointer cancellation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/qc?cartridge=archers-revenge");
    await waitForArena(page);
    const canvas = page.locator("[data-apk-canvas-host] canvas");
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error("Archer canvas has no bounds");
    const target = { x: bounds.x + 280 / 960 * bounds.width, y: bounds.y + 245 / 540 * bounds.height };
    const resolved = page.getByTestId("diagnostic-log").locator("p", { hasText: "ARENA_TARGET_RESOLVED" });

    await canvas.dispatchEvent("pointerdown", { pointerId: 17, pointerType: "touch", clientX: target.x, clientY: target.y });
    await canvas.dispatchEvent("pointercancel", { pointerId: 17, pointerType: "touch", clientX: target.x, clientY: target.y });
    await expect(resolved).toHaveCount(0);

    await page.mouse.move(target.x, target.y);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.up();
    await expect(resolved).toHaveCount(1);
    await page.waitForTimeout(200);
    await expect(resolved).toHaveCount(1);
  });

  for (const game of games) {
    test(`completes ${game.id} by keyboard with both editions lifecycle-safe`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/qc?cartridge=${game.id}`);
      await expect(page.getByRole("button", { name: new RegExp(game.title) })).toHaveAttribute("aria-pressed", "true");
      await waitForArena(page);
      await page.getByRole("button", { name: "Secondary Epic" }).click();
      await waitForArena(page);
      const resolved = page.getByTestId("diagnostic-log").locator("p", { hasText: "ARENA_TARGET_RESOLVED" });
      for (let index = 0; index < game.attempts; index += 1) {
        await page.keyboard.press("Space");
        await expect(resolved).toHaveCount(index + 1, { timeout: 5_000 });
      }
      await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Game result")).toContainText("Accuracy: 100%");
      await page.screenshot({ path: testInfo.outputPath(`${game.id}-desktop.png`), fullPage: true });
    });
  }
});

test.describe("APK W4 arena wave mobile touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("completes all five by tapping the visible correct target without overflow", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    for (const game of games) {
      await page.goto(`/qc?cartridge=${game.id}`);
      await waitForArena(page);
      const canvas = page.locator("[data-apk-canvas-host] canvas");
      await canvas.scrollIntoViewIfNeeded();
      const bounds = await canvas.boundingBox();
      if (!bounds) throw new Error(`${game.id} canvas has no bounds`);
      const resolved = page.getByTestId("diagnostic-log").locator("p", { hasText: "ARENA_TARGET_RESOLVED" });
      for (let index = 0; index < game.attempts; index += 1) {
        await page.touchscreen.tap(bounds.x + game.target[0] / 960 * bounds.width, bounds.y + game.target[1] / 540 * bounds.height);
        await expect(resolved).toHaveCount(index + 1, { timeout: 5_000 });
      }
      await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await page.screenshot({ path: testInfo.outputPath(`${game.id}-mobile.png`), fullPage: true });
    }
  });
});
