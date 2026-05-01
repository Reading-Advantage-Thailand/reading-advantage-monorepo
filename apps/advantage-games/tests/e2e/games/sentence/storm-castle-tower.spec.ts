import { expect, test } from "@playwright/test";

import { captureStormCastleTowerScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectStormCastleTowerStartScreen,
  getStormCastleTowerUrl,
  mockStormCastleTowerApis,
} from "../../helpers/gameHelpers";

test.describe("storm-castle-tower", () => {
  test("loads storm-castle-tower with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockStormCastleTowerApis(page);

    await page.goto(getStormCastleTowerUrl(), { waitUntil: "networkidle" });

    await expectStormCastleTowerStartScreen(page);

    const startButton = page.getByRole("button", { name: /storm the tower/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureStormCastleTowerScreenshot(page);
    expect(screenshotPath).toContain("/public/games/storm-castle-tower/");
  });
});