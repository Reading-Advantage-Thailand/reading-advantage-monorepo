import { expect, test } from "@playwright/test";

const browserQcEnabled = process.env.APK_TUTORIAL_QC_BROWSER === "1";

test.describe("APK guided tutorial QC", () => {
  test.beforeEach(async ({}, testInfo) => {
    testInfo.skip(
      !browserQcEnabled,
      "Set APK_TUTORIAL_QC_BROWSER=1 to run the credential/runtime-gated browser QC.",
    );
  });

  test("previews tutorial states independently at compact and wide reference viewports", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    const qc = page.getByRole("region", { name: "Guided tutorial QC preview" });
    await expect(qc).toBeVisible();
    await expect(qc.getByLabel("Tutorial fixture")).toBeVisible();
    await expect(qc.getByText(/zero production completions/i)).toBeVisible();
    await expect(qc.getByText(/one canvas/i)).toBeVisible();

    await qc.getByRole("button", { name: /wide/i }).click();
    await qc.getByLabel("Tutorial input mode").selectOption("touch");
    await qc.getByRole("button", { name: /reduced motion/i }).click();
    await expect(qc).toHaveAttribute("data-apk-layout-profile", "wide");
    await expect(qc).toHaveAttribute("data-apk-input-mode", "touch");
    await expect(qc).toHaveAttribute("data-apk-reduced-motion", "true");
    await expect(qc.getByRole("img", { name: /guided tutorial phaser canvas/i })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("replays and interrupts the tutorial without a completion, obstruction, or leaked resource", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    const qc = page.getByRole("region", { name: "Guided tutorial QC preview" });
    await qc.getByRole("button", { name: /start tutorial/i }).click();
    await qc.getByRole("button", { name: /replay tutorial/i }).click();
    await qc.getByRole("button", { name: /interrupt tutorial/i }).click();

    await expect(qc.getByRole("status")).toContainText(/interrupted|clean/i);
    await expect(qc).toContainText("Timers: 0");
    await expect(qc).toContainText("Listeners: 0");
    await expect(qc).toContainText("Phaser objects: 0");
    await expect(qc.getByRole("region", { name: "Game result" })).toHaveCount(0);
    await expect(qc.getByRole("img", { name: /guided tutorial phaser canvas/i })).toHaveCount(1);
    expect(await page.locator("[data-apk-canvas-host] canvas").count()).toBeLessThanOrEqual(1);
  });
});
