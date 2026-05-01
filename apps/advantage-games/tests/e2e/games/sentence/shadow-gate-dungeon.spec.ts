import { expect, test } from "@playwright/test";

import { captureShadowGateDungeonScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectShadowGateDungeonStartScreen,
  getShadowGateDungeonUrl,
  mockShadowGateDungeonApis,
} from "../../helpers/gameHelpers";

test.describe("shadow-gate-dungeon", () => {
  test("loads shadow-gate-dungeon with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockShadowGateDungeonApis(page);

    await page.goto(getShadowGateDungeonUrl(), { waitUntil: "networkidle" });

    await expectShadowGateDungeonStartScreen(page);

    const startButton = page.getByRole("button", { name: /enter the dungeon/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureShadowGateDungeonScreenshot(page);
    expect(screenshotPath).toContain("/public/games/shadow-gate-dungeon/");
  });

  test("displays insufficient sentences warning when needed", async ({ page }) => {
    await page.route("**/api/v1/games/shadow-gate-dungeon/sentences**", async (route) => {
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

    await page.goto(getShadowGateDungeonUrl(), { waitUntil: "networkidle" });

    await expect(page.getByText(/ประโยคที่บันทึกไว้ไม่เพียงพอ/i)).toBeVisible({ timeout: 15000 });
  });
});