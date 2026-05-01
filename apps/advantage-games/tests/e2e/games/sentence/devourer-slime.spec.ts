import { expect, test } from "@playwright/test";

import { DEVOURER_SLIME_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureDevourerSlimeScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectDevourerSlimeStartScreen,
  getDevourerSlimeUrl,
  mockDevourerSlimeApis,
} from "../../helpers/gameHelpers";

test.describe("devourer-slime", () => {
  test("loads devourer-slime with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockDevourerSlimeApis(page);

    await page.goto(getDevourerSlimeUrl(), { waitUntil: "networkidle" });

    await expectDevourerSlimeStartScreen(page);
    await expect(page.getByText(DEVOURER_SLIME_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureDevourerSlimeScreenshot(page);
    expect(screenshotPath).toContain("/public/games/devourer-slime/");
  });
});
