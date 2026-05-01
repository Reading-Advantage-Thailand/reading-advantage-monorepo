import { expect, test } from "@playwright/test";

import { HAUNTED_LIBRARY_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureHauntedLibraryScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectHauntedLibraryStartScreen,
  getHauntedLibraryUrl,
  mockHauntedLibraryApis,
} from "../../helpers/gameHelpers";

test.describe("haunted-library", () => {
  test("loads haunted-library with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockHauntedLibraryApis(page);

    await page.goto(getHauntedLibraryUrl(), { waitUntil: "networkidle" });

    await expectHauntedLibraryStartScreen(page);
    await expect(page.getByText(HAUNTED_LIBRARY_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureHauntedLibraryScreenshot(page);
    expect(screenshotPath).toContain("/public/games/haunted-library/");
  });
});
