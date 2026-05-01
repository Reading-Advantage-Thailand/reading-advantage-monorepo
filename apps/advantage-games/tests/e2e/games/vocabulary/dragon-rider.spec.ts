import { expect, test } from "@playwright/test";

import { DRAGON_RIDER_SAMPLE_VOCABULARY } from "../../fixtures/gameFixtures";
import { captureDragonRiderScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectDragonRiderStartScreen,
  getDragonRiderUrl,
  mockDragonRiderApis,
} from "../../helpers/gameHelpers";

test.describe("dragon-rider", () => {
  test("loads dragon-rider with the shared sample vocabulary and captures gameplay", async ({
    page,
  }) => {
    await mockDragonRiderApis(page);

    await page.goto(getDragonRiderUrl(), { waitUntil: "networkidle" });

    await expectDragonRiderStartScreen(page);
    await expect(page.getByText(DRAGON_RIDER_SAMPLE_VOCABULARY[0].term)).toBeVisible();
    await expect(page.getByText(DRAGON_RIDER_SAMPLE_VOCABULARY[0].translation)).toBeVisible();

    await page.getByRole("button", { name: /start adventure/i }).click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureDragonRiderScreenshot(page);
    expect(screenshotPath).toContain(
      "/public/games/dragon-rider/dragon-rider-gameplay.png"
    );
  });
});
