import { expect, test } from "@playwright/test";

import { MAGIC_DEFENSE_SAMPLE_VOCABULARY } from "../../fixtures/gameFixtures";
import { captureMagicDefenseScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectMagicDefenseStartScreen,
  getMagicDefenseUrl,
  mockMagicDefenseApis,
} from "../../helpers/gameHelpers";

test.describe("magic-defense", () => {
  test("loads magic-defense with sample vocabulary and captures gameplay", async ({ page }) => {
    await mockMagicDefenseApis(page);

    await page.goto(getMagicDefenseUrl(), { waitUntil: "networkidle" });

    await expectMagicDefenseStartScreen(page);
    await expect(page.getByText(MAGIC_DEFENSE_SAMPLE_VOCABULARY[0].term)).toBeVisible();

    await page.getByRole("button", { name: /play/i }).click();

    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15000 });

    const screenshotPath = await captureMagicDefenseScreenshot(page);
    expect(screenshotPath).toContain("/public/games/magic-defense/");
  });
});
