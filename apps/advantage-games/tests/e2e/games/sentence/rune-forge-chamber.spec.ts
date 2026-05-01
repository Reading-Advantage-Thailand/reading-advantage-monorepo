import { expect, test } from "@playwright/test";

import { captureRuneForgeChamberScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectRuneForgeChamberStartScreen,
  getRuneForgeChamberUrl,
  mockRuneForgeChamberApis,
} from "../../helpers/gameHelpers";

test.describe("rune-forge-chamber", () => {
  test("loads rune-forge-chamber with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockRuneForgeChamberApis(page);

    await page.goto(getRuneForgeChamberUrl(), { waitUntil: "networkidle" });

    await expectRuneForgeChamberStartScreen(page);

    const startButton = page.getByRole("button", { name: /enter the forge/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureRuneForgeChamberScreenshot(page);
    expect(screenshotPath).toContain("/public/games/rune-forge-chamber/");
  });

  test("displays insufficient sentences warning when needed", async ({ page }) => {
    await page.route("**/api/v1/games/rune-forge-chamber/sentences**", async (route) => {
      const response = {
        status: 200,
        warning: "INSUFFICIENT_SENTENCES",
        requiredCount: 5,
        currentCount: 2,
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await page.goto(getRuneForgeChamberUrl(), { waitUntil: "networkidle" });

    await expect(page.getByText(/ประโยคที่บันทึกไว้ไม่เพียงพอ/i)).toBeVisible({ timeout: 15000 });
  });
});