import { expect, test } from "@playwright/test";

import { DUNGEON_LIBERATOR_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureDungeonLiberatorScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectDungeonLiberatorStartScreen,
  getDungeonLiberatorUrl,
  mockDungeonLiberatorApis,
} from "../../helpers/gameHelpers";

test.describe("dungeon-liberator", () => {
  test("loads dungeon-liberator with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockDungeonLiberatorApis(page);

    await page.goto(getDungeonLiberatorUrl(), { waitUntil: "networkidle" });

    await expectDungeonLiberatorStartScreen(page);
    await expect(page.getByText(DUNGEON_LIBERATOR_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureDungeonLiberatorScreenshot(page);
    expect(screenshotPath).toContain("/public/games/dungeon-liberator/");
  });
});
