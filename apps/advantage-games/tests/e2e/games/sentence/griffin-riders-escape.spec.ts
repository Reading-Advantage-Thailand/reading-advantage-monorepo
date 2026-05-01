import { expect, test } from "@playwright/test";

import { GRIFFIN_RIDERS_ESCAPE_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureGriffinRidersEscapeScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectGriffinRidersEscapeStartScreen,
  getGriffinRidersEscapeUrl,
  mockGriffinRidersEscapeApis,
} from "../../helpers/gameHelpers";

test.describe("griffin-riders-escape", () => {
  test("loads griffin-riders-escape with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockGriffinRidersEscapeApis(page);

    await page.goto(getGriffinRidersEscapeUrl(), { waitUntil: "networkidle" });

    await expectGriffinRidersEscapeStartScreen(page);
    await expect(page.getByText(GRIFFIN_RIDERS_ESCAPE_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureGriffinRidersEscapeScreenshot(page);
    expect(screenshotPath).toContain("/public/games/griffin-riders-escape/");
  });
});
