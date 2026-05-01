import { expect, test } from "@playwright/test";

import { captureVillageGuardianScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectVillageGuardianStartScreen,
  getVillageGuardianUrl,
  mockVillageGuardianApis,
} from "../../helpers/gameHelpers";

test.describe("village-guardian", () => {
  test("loads village-guardian with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockVillageGuardianApis(page);

    await page.goto(getVillageGuardianUrl(), { waitUntil: "networkidle" });

    await expectVillageGuardianStartScreen(page);

    const startButton = page.getByRole("button", { name: /defend the village/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureVillageGuardianScreenshot(page);
    expect(screenshotPath).toContain("/public/games/village-guardian/");
  });
});