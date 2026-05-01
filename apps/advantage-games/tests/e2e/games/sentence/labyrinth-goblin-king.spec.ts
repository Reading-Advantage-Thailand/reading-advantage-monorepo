import { expect, test } from "@playwright/test";

import { LABYRINTH_GOBLIN_KING_SAMPLE_SENTENCES } from "../../fixtures/gameFixtures";
import { captureLabyrinthGoblinKingScreenshot } from "../../helpers/screenshotHelpers";
import {
  expectLabyrinthGoblinKingStartScreen,
  getLabyrinthGoblinKingUrl,
  mockLabyrinthGoblinKingApis,
} from "../../helpers/gameHelpers";

test.describe("labyrinth-goblin-king", () => {
  test("loads labyrinth-goblin-king with sample sentences and captures gameplay", async ({
    page,
  }) => {
    await mockLabyrinthGoblinKingApis(page);

    await page.goto(getLabyrinthGoblinKingUrl(), { waitUntil: "networkidle" });

    await expectLabyrinthGoblinKingStartScreen(page);
    await expect(page.getByText(LABYRINTH_GOBLIN_KING_SAMPLE_SENTENCES[0].term)).toBeVisible();

    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    await expect(page.locator("canvas").first()).toBeVisible();

    const screenshotPath = await captureLabyrinthGoblinKingScreenshot(page);
    expect(screenshotPath).toContain("/public/games/labyrinth-goblin-king/");
  });
});
