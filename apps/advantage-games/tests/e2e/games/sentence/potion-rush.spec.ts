import { expect, test } from "@playwright/test";

import { POTION_RUSH_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { capturePotionRushScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectPotionRushStartScreen,
  getPotionRushUrl,
  mockPotionRushApis,
} from "../../helpers/gameHelpers";

test.describe("potion-rush", () => {
  test("loads potion-rush with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockPotionRushApis(page);

    await page.goto(getPotionRushUrl(), { waitUntil: "networkidle" });

    await expectPotionRushStartScreen(page);

    const startButton = page.getByRole("button", { name: /start brewing/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await capturePotionRushScreenshot(page);
    expect(screenshotPath).toContain("/public/games/potion-rush/");
  });

  test("displays insufficient sentences warning when needed", async ({ page }) => {
    await page.route("**/api/v1/games/potion-rush/sentences**", async (route) => {
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

    await page.goto(getPotionRushUrl(), { waitUntil: "networkidle" });

    await expect(page.getByText(/Insufficient Sentences/i)).toBeVisible({ timeout: 15000 });
  });
});
