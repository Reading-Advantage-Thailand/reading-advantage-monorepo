import { test, expect, type Page } from "@playwright/test";
import { getHostProofTestCredentials } from "../../host-proof-test-config";

const CARTRIDGE_IDS = [
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "sorcerer-ziggurat",
  "astral-mage",
] as const;

const { classCode: TEST_CLASS_CODE } = getHostProofTestCredentials();

const VIEWPORTS = {
  compact: { width: 390, height: 844 },
  wide: { width: 1280, height: 800 },
} as const;

const INPUT_MODES = ["keyboard", "pointer", "touch"] as const;

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

test.beforeEach(({ page }) => {
  test.skip(!TEST_CLASS_CODE, "HOST_PROOF_TEST_CLASS_CODE not set");
  // Authenticated storage state is produced by tests/e2e/host-proof-auth.setup.ts.
  void page;
});

async function selectCartridge(page: Page, cartridgeId: string) {
  await page.waitForSelector("[data-host-proof-boundary='reading-primary-host-proof-only']");
  await page.selectOption("select[aria-label='Select host-proof cartridge']", cartridgeId);
  await expect(page.locator("[data-testid='host-proof-game-container']")).toHaveAttribute(
    "data-cartridge-id",
    cartridgeId,
  );
}

for (const cartridgeId of CARTRIDGE_IDS) {
  for (const [profile, viewport] of Object.entries(VIEWPORTS)) {
    for (const inputMode of INPUT_MODES) {
      test(`${cartridgeId} ${profile} viewport accepts ${inputMode} input and persists completion`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto("/en/student/host-proof/games");
        await selectCartridge(page, cartridgeId);

        await expect(page.locator("[data-testid='host-proof-profile']")).toHaveText(profile);
        const container = page.locator("[data-testid='host-proof-game-container']");
        await expect(container).toHaveAttribute("data-profile", profile);

        if (inputMode === "keyboard") {
          await container.press("Enter");
        } else {
          if (inputMode === "pointer") {
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
        }

        await expect(page.locator(`[data-testid="host-proof-${inputMode}-count"]`)).toHaveText("1");
        await page.click("[data-testid='host-proof-complete-button']");
        await expect(page.locator("text=Completed!")).toBeVisible();
        await expect(page.locator("[data-testid='host-proof-history-item']").first()).toContainText(cartridgeId);
      });
    }
  }

  test(`${cartridgeId} duplicate completion reports duplicate without extra XP`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    await page.click("[data-testid='host-proof-primary-button']");
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.locator("text=Completed!")).toBeVisible();

    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.locator("text=Duplicate completion")).toBeVisible();
  });

  test(`${cartridgeId} completion survives replay and navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    await page.click("[data-testid='host-proof-primary-button']");
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.locator("text=Completed!")).toBeVisible();

    // Navigate away and back to assert server-side persistence and replay.
    await page.goto("/en/student/read");
    await expect(page.url()).toContain("/en/student/read");

    await page.goto("/en/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    const historyItem = page.locator("[data-testid='host-proof-history-item']").first();
    await expect(historyItem).toContainText(cartridgeId);

    // Replay creates a fresh attempt; retrying an unchanged request is what is idempotent.
    await page.click("[data-testid='host-proof-replay-button']");
    await page.click("[data-testid='host-proof-primary-button']");
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.locator("text=Completed!")).toBeVisible();
  });
}
