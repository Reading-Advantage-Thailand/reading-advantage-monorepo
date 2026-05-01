import { expect, test } from "@playwright/test";

import { PALADINS_TWIN_SOUL_SAMPLE_VOCABULARY } from "../../fixtures/gameFixtures";
import { capturePaladinsTwinSoulScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectPaladinsTwinSoulStartScreen,
  getPaladinsTwinSoulUrl,
  mockPaladinsTwinSoulApis,
} from "../../helpers/gameHelpers";

import { readFileSync } from "fs";

test.describe("paladins-twin-soul", () => {
  test("loads paladins-twin-soul with sample vocabulary and captures gameplay", async ({ page }) => {
    await mockPaladinsTwinSoulApis(page);

    await page.goto(getPaladinsTwinSoulUrl(), { waitUntil: "networkidle" });

    await expectPaladinsTwinSoulStartScreen(page);
    await expect(page.getByText(PALADINS_TWIN_SOUL_SAMPLE_VOCABULARY[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /begin/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await capturePaladinsTwinSoulScreenshot(page);
    expect(screenshotPath).toContain("/public/games/paladins-twin-soul/");
  });
});
