import { expect, test } from "@playwright/test";
import { createGateRunnerState } from "@reading-advantage/game-cartridges/gate-runner";

test.describe("APK quality-control lab", () => {
  test("loads a Phaser cartridge and swaps editions without copied game routes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/qc");

    await expect(page.getByRole("heading", { name: "Cartridge proving ground" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sky Gate Sprint/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1, { timeout: 30_000 });

    await page.getByRole("button", { name: "Secondary Epic" }).click();
    await expect(page.getByRole("button", { name: "Secondary Epic" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1);

    await page.getByRole("button", { name: /Rune Trail/ }).click();
    await expect(page.getByText("sentence-collector · sentence", { exact: true })).toBeVisible();
    await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1);
    await expect(page.getByText(/Nothing is authenticated or persisted/)).toBeVisible();
    await page.screenshot({ path: "/tmp/apk-qc-desktop.png", fullPage: true });
  });

  test("keeps controls and diagnostics available at the mobile reference size", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    await expect(page.getByLabel("Content fixture")).toBeVisible();
    await expect(page.getByLabel("Difficulty seed")).toBeVisible();
    await expect(page.getByText("Game ready", { exact: true })).toBeVisible({ timeout: 30_000 });
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
    await expect(page.getByText(/"gameType": "gate-runner"/)).toBeVisible();
  });
});
