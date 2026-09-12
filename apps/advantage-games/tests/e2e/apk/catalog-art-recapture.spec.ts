import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const evidenceDir = path.resolve(
  process.cwd(),
  "../../measure/tracks/apk_product_simplification_20260820/evidence",
);

test.describe("catalog standard-pack art recapture", () => {
  test("draws a canvas for Dragon Flight at compact and wide sizes", async ({ page }) => {
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/student/arcade/dragon-flight");
    const briefing = page.getByRole("dialog", { name: "Dragon Flight" });
    await expect(briefing).toBeVisible({ timeout: 20000 });
    await briefing.getByRole("button", { name: "Start guided tutorial" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Guided tutorial ready")).toBeVisible();
    await page.getByRole("button", { name: "Skip tutorial" }).click();
    await expect(page.locator("[data-apk-canvas-host] canvas")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "dragon-flight-compact.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("[data-apk-canvas-host] canvas")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "dragon-flight-wide.png"),
      fullPage: true,
    });
  });
});
