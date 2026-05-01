import { expect, test } from "@playwright/test";

import { ABYSSAL_WELL_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureAbyssalWellScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectAbyssalWellStartScreen,
  getAbyssalWellUrl,
  mockAbyssalWellApis,
} from "../../helpers/gameHelpers";

test.describe("abyssal-well", () => {
  test("loads abyssal-well with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockAbyssalWellApis(page);

    await page.goto(getAbyssalWellUrl(), { waitUntil: "networkidle" });

    await expectAbyssalWellStartScreen(page);
    await expect(page.getByText(ABYSSAL_WELL_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureAbyssalWellScreenshot(page);
    expect(screenshotPath).toContain("/public/games/abyssal-well/");
  });
});
