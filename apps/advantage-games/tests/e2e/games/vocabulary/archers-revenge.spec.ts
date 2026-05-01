import { expect, test } from "@playwright/test";

import { ARCHERS_REVENGE_SAMPLE_VOCABULARY } from "../../fixtures/gameFixtures";
import { captureArchersRevengeScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectArchersRevengeStartScreen,
  getArchersRevengeUrl,
  mockArchersRevengeApis,
} from "../../helpers/gameHelpers";

test.describe("archers-revenge", () => {
  test("loads archers-revenge with the shared sample vocabulary and captures gameplay", async ({
    page,
  }) => {
    await mockArchersRevengeApis(page);

    await page.goto(getArchersRevengeUrl(), { waitUntil: "domcontentloaded" });

    await expectArchersRevengeStartScreen(page);
    await expect(page.getByText(ARCHERS_REVENGE_SAMPLE_VOCABULARY[0].term)).toBeVisible();
    await expect(page.getByText(ARCHERS_REVENGE_SAMPLE_VOCABULARY[0].translation)).toBeVisible();

    await page.getByRole("button", { name: /draw your bow/i }).click();

    await expect(page.locator("canvas")).toBeVisible();

    const screenshotPath = await captureArchersRevengeScreenshot(page);
    expect(screenshotPath).toContain(
      "/public/games/archers-revenge/archers-revenge-gameplay.png"
    );
  });
});
