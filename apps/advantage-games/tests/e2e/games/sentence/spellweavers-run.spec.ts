import { expect, test } from "@playwright/test";

import { captureSpellweaversRunScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectSpellweaversRunStartScreen,
  getSpellweaversRunUrl,
  mockSpellweaversRunApis,
} from "../../helpers/gameHelpers";

test.describe("spellweavers-run", () => {
  test("loads spellweavers-run with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockSpellweaversRunApis(page);

    await page.goto(getSpellweaversRunUrl(), { waitUntil: "networkidle" });

    await expectSpellweaversRunStartScreen(page);

    const startButton = page.getByRole("button", { name: /begin the run/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureSpellweaversRunScreenshot(page);
    expect(screenshotPath).toContain("/public/games/spellweavers-run/");
  });

  test("displays insufficient sentences warning when needed", async ({ page }) => {
    await page.route("**/api/v1/games/spellweavers-run/sentences**", async (route) => {
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

    await page.goto(getSpellweaversRunUrl(), { waitUntil: "networkidle" });

    await expect(page.getByText(/ประโยคที่บันทึกไว้ไม่เพียงพอ/i)).toBeVisible({ timeout: 15000 });
  });
});