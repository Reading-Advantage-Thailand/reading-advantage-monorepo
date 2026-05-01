import { expect, test } from "@playwright/test";

import { GRIFFIN_SKY_JOUST_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureGriffinSkyJoustScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectGriffinSkyJoustStartScreen,
  getGriffinSkyJoustUrl,
  mockGriffinSkyJoustApis,
} from "../../helpers/gameHelpers";

test.describe("griffin-sky-joust", () => {
  test("loads griffin-sky-joust with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockGriffinSkyJoustApis(page);

    await page.goto(getGriffinSkyJoustUrl(), { waitUntil: "networkidle" });

    await expectGriffinSkyJoustStartScreen(page);
    await expect(page.getByText(GRIFFIN_SKY_JOUST_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureGriffinSkyJoustScreenshot(page);
    expect(screenshotPath).toContain("/public/games/griffin-sky-joust/");
  });
});
