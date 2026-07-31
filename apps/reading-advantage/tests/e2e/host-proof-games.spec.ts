import { test, expect, type Page } from "@playwright/test";

const CARTRIDGE_IDS = [
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "sorcerer-ziggurat",
  "astral-mage",
] as const;
const VIEWPORTS = {
  compact: { width: 390, height: 844 },
  wide: { width: 1280, height: 800 },
} as const;
const INPUTS = ["keyboard", "pointer", "touch"] as const;

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

async function selectReadyCartridge(page: Page, cartridgeId: string) {
  await page.waitForSelector("[data-host-proof-boundary='reading-primary-host-proof-only']");
  const container = page.locator("[data-testid='host-proof-game-container']");
  await expect(container).toHaveAttribute("data-cartridge-id", "dragon-flight", { timeout: 60_000 });
  await page.selectOption("select[aria-label='Select host-proof cartridge']", cartridgeId);
  await expect(container).toHaveAttribute("data-cartridge-id", cartridgeId, { timeout: 60_000 });
  return container;
}

for (const cartridgeId of CARTRIDGE_IDS) {
  for (const [profileName, viewport] of Object.entries(VIEWPORTS)) {
    for (const input of INPUTS) {
      test(`${cartridgeId} accepts real ${input} input and persists completion in ${profileName}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto("/en/student/host-proof/games");
        const container = await selectReadyCartridge(page, cartridgeId);
        await expect(page.locator("[data-testid='host-proof-profile']")).toHaveText(profileName);
        await expect(container).toHaveAttribute("data-profile", profileName);

        if (input === "keyboard") {
          await container.press("Enter");
        } else if (input === "pointer") {
          const size = await container.evaluate((element) => ({
            width: element.clientWidth,
            height: element.clientHeight,
          }));
          await container.click({
            position: { x: size.width * 0.75, y: size.height / 2 },
          });
        } else {
          await container.scrollIntoViewIfNeeded();
          const box = await container.boundingBox();
          expect(box).not.toBeNull();
          const x = box!.x + box!.width * 0.75;
          const y = box!.y + box!.height / 2;
          await page.touchscreen.tap(x, y);
        }

        await expect(page.locator(`[data-testid='host-proof-${input}-count']`)).toHaveText("1");
        await page.click("[data-testid='host-proof-complete-button']");
        await expect(page.getByText("Completed!")).toBeVisible();
        await expect(page.locator("[data-testid='host-proof-history-item']").first()).toContainText(cartridgeId);
      });
    }
  }

  test(`${cartridgeId} retains one persisted activity for a duplicate completion`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.compact);
    await page.goto("/en/student/host-proof/games");
    await selectReadyCartridge(page, cartridgeId);
    await page.click("[data-testid='host-proof-primary-button']");
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.getByText("Completed!")).toBeVisible();
    const historyCount = await page.locator("[data-testid='host-proof-history-item']").count();

    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.getByText("Duplicate completion recorded (no additional XP).")).toBeVisible();
    await expect(page.locator("[data-testid='host-proof-history-item']")).toHaveCount(historyCount);
  });

  test(`${cartridgeId} replays into a new completion and navigates only accepted bindings`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.compact);
    await page.goto("/en/student/host-proof/games");
    await selectReadyCartridge(page, cartridgeId);

    const history = page.locator("[data-testid='host-proof-history-item']");
    const initialHistoryCount = await history.count();
    const primaryButton = page.locator("[data-testid='host-proof-primary-button']");
    await expect(primaryButton).toBeVisible();
    await primaryButton.click();
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.getByText("Completed!")).toBeVisible();
    await expect(history).toHaveCount(Math.min(initialHistoryCount + 1, 50));
    await expect(history.first()).toContainText(cartridgeId);

    await page.click("[data-testid='host-proof-replay-button']");
    await expect(page.locator("[data-testid='host-proof-game-container']")).toHaveAttribute(
      "data-cartridge-id",
      cartridgeId,
      { timeout: 60_000 },
    );
    await expect(page.locator("[data-testid='host-proof-score']")).toHaveText("0 / 0");

    await expect(primaryButton).toBeVisible();
    await primaryButton.click();
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.getByText("Completed!")).toBeVisible();
    await expect(history).toHaveCount(Math.min(initialHistoryCount + 2, 50));
    await expect(history.first()).toContainText(cartridgeId);

    const currentIndex = CARTRIDGE_IDS.indexOf(cartridgeId);
    const nextCartridgeId = CARTRIDGE_IDS[(currentIndex + 1) % CARTRIDGE_IDS.length];
    await page.getByRole("button", { name: "Next host-proof cartridge" }).click();
    await expect(page.getByLabel("Select host-proof cartridge")).toHaveValue(nextCartridgeId);
    await page.getByRole("button", { name: "Previous host-proof cartridge" }).click();
    await expect(page.getByLabel("Select host-proof cartridge")).toHaveValue(cartridgeId);
  });
}
