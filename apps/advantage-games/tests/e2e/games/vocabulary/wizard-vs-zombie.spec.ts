import { expect, test } from "@playwright/test";

import { WIZARD_VS_ZOMBIE_SAMPLE_VOCABULARY } from "../../fixtures/gameFixtures";
import { captureWizardVsZombieScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectWizardVsZombieStartScreen,
  getWizardVsZombieUrl,
  mockWizardVsZombieApis,
} from "../../helpers/gameHelpers";

test.describe("wizard-vs-zombie", () => {
  test("loads wizard-vs-zombie with sample vocabulary and captures gameplay", async ({
    page,
  }) => {
    await mockWizardVsZombieApis(page);

    await page.goto(getWizardVsZombieUrl(), { waitUntil: "networkidle" });

    await expectWizardVsZombieStartScreen(page);
    await expect(page.getByText(WIZARD_VS_ZOMBIE_SAMPLE_VOCABULARY[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureWizardVsZombieScreenshot(page);
    expect(screenshotPath).toContain("/public/games/wizard-vs-zombie/");
  });
});
