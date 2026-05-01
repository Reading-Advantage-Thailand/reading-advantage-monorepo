import { expect, test } from "@playwright/test";

import { GRYPHON_PATROL_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureGryphonPatrolScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectGryphonPatrolStartScreen,
  getGryphonPatrolUrl,
  mockGryphonPatrolApis,
} from "../../helpers/gameHelpers";

test.describe("gryphon-patrol", () => {
  test("loads gryphon-patrol with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockGryphonPatrolApis(page);

    await page.goto(getGryphonPatrolUrl(), { waitUntil: "networkidle" });

    await expectGryphonPatrolStartScreen(page);
    await expect(page.getByText(GRYPHON_PATROL_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureGryphonPatrolScreenshot(page);
    expect(screenshotPath).toContain("/public/games/gryphon-patrol/");
  });
});
