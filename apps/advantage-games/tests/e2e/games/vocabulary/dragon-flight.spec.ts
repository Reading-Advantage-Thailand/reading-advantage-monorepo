import { expect, test } from "@playwright/test";

import { DRAGON_FLIGHT_SAMPLE_VOCABULARY } from "../../fixtures/gameFixtures";
import { captureDragonFlightScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectDragonFlightStartScreen,
  getDragonFlightUrl,
  mockDragonFlightApis,
} from "../../helpers/gameHelpers";

test.describe("dragon-flight", () => {
  test("loads dragon-flight with the shared sample vocabulary and captures gameplay", async ({
    page,
  }) => {
    await mockDragonFlightApis(page);

    await page.goto(getDragonFlightUrl(), { waitUntil: "networkidle" });

    await expectDragonFlightStartScreen(page);
    await expect(page.getByText(DRAGON_FLIGHT_SAMPLE_VOCABULARY[0].term)).toBeVisible();
    await expect(page.getByText(DRAGON_FLIGHT_SAMPLE_VOCABULARY[0].translation)).toBeVisible();

    // Wait for assets to load before starting
    await expect(page.getByText(/Ready/i)).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: /start game/i }).click();

    await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });

    const screenshotPath = await captureDragonFlightScreenshot(page);
    expect(screenshotPath).toContain(
      "/public/games/dragon-flight/dragon-flight-gameplay.png"
    );
  });
});
