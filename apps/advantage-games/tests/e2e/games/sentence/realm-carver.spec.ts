import { expect, test } from "@playwright/test";

import { captureRealmCarverScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectRealmCarverStartScreen,
  getRealmCarverUrl,
  mockRealmCarverApis,
} from "../../helpers/gameHelpers";

test.describe("realm-carver", () => {
  test("loads realm-carver with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockRealmCarverApis(page);

    await page.goto(getRealmCarverUrl(), { waitUntil: "networkidle" });

    await expectRealmCarverStartScreen(page);

    const startButton = page.getByRole("button", { name: /start mapping/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureRealmCarverScreenshot(page);
    expect(screenshotPath).toContain("/public/games/realm-carver/");
  });

  test("displays insufficient sentences warning when needed", async ({ page }) => {
    await page.route("**/api/v1/games/realm-carver/sentences**", async (route) => {
      const response = {
        status: 200,
        warning: "NO_SENTENCES",
        message: "No sentences available for this level.",
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await page.goto(getRealmCarverUrl(), { waitUntil: "networkidle" });

    await expect(page.getByText(/Unable to Start Game/i)).toBeVisible({ timeout: 15000 });
  });
});