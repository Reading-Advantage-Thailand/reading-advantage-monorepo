import { expect, test } from "@playwright/test";

import { ENCHANTED_LIBRARY_SAMPLE_VOCABULARY } from "../../fixtures/gameFixtures";
import { captureEnchantedLibraryScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectEnchantedLibraryStartScreen,
  getEnchantedLibraryUrl,
  mockEnchantedLibraryApis,
} from "../../helpers/gameHelpers";

test.describe("enchanted-library", () => {
  test("loads enchanted-library with sample vocabulary and captures gameplay", async ({ page }) => {
    await mockEnchantedLibraryApis(page);

    await page.goto(getEnchantedLibraryUrl(), { waitUntil: "networkidle" });

    await expectEnchantedLibraryStartScreen(page);
    await expect(page.getByText(ENCHANTED_LIBRARY_SAMPLE_VOCABULARY[0].term)).toBeVisible();

    await page.getByRole("button", { name: /play/i }).click();

    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15000 });

    const screenshotPath = await captureEnchantedLibraryScreenshot(page);
    expect(screenshotPath).toContain("/public/games/enchanted-library/");
  });
});
