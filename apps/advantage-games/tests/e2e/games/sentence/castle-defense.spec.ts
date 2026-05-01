import { expect, test } from "@playwright/test";

import { CASTLE_DEFENSE_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureCastleDefenseScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectCastleDefenseStartScreen,
  getCastleDefenseUrl,
  mockCastleDefenseApis,
} from "../../helpers/gameHelpers";

test.describe("castle-defense", () => {
  test("loads castle-defense with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockCastleDefenseApis(page);

    await page.goto(getCastleDefenseUrl(), { waitUntil: "networkidle" });

    await expectCastleDefenseStartScreen(page);
    await expect(page.getByText(CASTLE_DEFENSE_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureCastleDefenseScreenshot(page);
    expect(screenshotPath).toContain("/public/games/castle-defense/");
  });
});
