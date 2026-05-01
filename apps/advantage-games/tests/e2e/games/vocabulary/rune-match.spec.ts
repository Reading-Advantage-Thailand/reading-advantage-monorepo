import { expect, test } from "@playwright/test";

import { RUNE_MATCH_SAMPLE_VOCABULARY } from "../../fixtures/gameFixtures";
import { captureRuneMatchScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectRuneMatchStartScreen,
  getRuneMatchUrl,
  mockRuneMatchApis,
} from "../../helpers/gameHelpers";

test.describe("rune-match", () => {
  test("loads rune-match with the shared sample vocabulary and captures gameplay", async ({
    page,
  }) => {
    await mockRuneMatchApis(page);

    await page.goto(getRuneMatchUrl(), { waitUntil: "domcontentloaded" });

    await expectRuneMatchStartScreen(page);
    await expect(page.getByText(RUNE_MATCH_SAMPLE_VOCABULARY[0].term)).toBeVisible();
    await expect(page.getByText(RUNE_MATCH_SAMPLE_VOCABULARY[0].translation)).toBeVisible();

    await page.getByRole("button", { name: /start game/i }).click();

    await expect(page.locator("canvas")).toBeVisible();

    const screenshotPath = await captureRuneMatchScreenshot(page);
    expect(screenshotPath).toContain(
      "/public/games/rune-match/rune-match-gameplay.png"
    );
  });
});
