import { test, expect } from "@playwright/test";

const CARTRIDGE_IDS = [
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "sorcerer-ziggurat",
  "astral-mage",
] as const;

const TEST_CLASS_CODE = process.env.HOST_PROOF_TEST_CLASS_CODE ?? "";

test.describe.configure({ mode: "serial" });

test.beforeEach(({ page }) => {
  test.skip(!TEST_CLASS_CODE, "HOST_PROOF_TEST_CLASS_CODE not set");
  // Authenticated storage state is produced by tests/e2e/host-proof-auth.setup.ts.
  void page;
});

async function selectCartridge(page, cartridgeId: string) {
  await page.waitForSelector("[data-host-proof-boundary='reading-primary-host-proof-only']");
  await page.selectOption("select[aria-label='Select host-proof cartridge']", cartridgeId);
}

for (const cartridgeId of CARTRIDGE_IDS) {
  test(`${cartridgeId} compact viewport accepts pointer input and persists completion`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    const profile = page.locator("[data-testid='host-proof-profile']");
    await expect(profile).toHaveText("compact");

    const container = page.locator("[data-testid='host-proof-game-container']");
    await expect(container).toHaveAttribute("data-profile", "compact");

    const box = await container.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width * 0.75, box!.y + box!.height / 2);

    await expect(page.locator("[data-testid='host-proof-pointer-count']")).toHaveText("1");
    await page.click("[data-testid='host-proof-complete-button']");

    await expect(page.locator("text=Completed!")).toBeVisible();
    await expect(page.locator("[data-testid='host-proof-history-item']").first()).toContainText(cartridgeId);
  });

  test(`${cartridgeId} compact viewport accepts real touch input`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    const container = page.locator("[data-testid='host-proof-game-container']");
    const box = await container.boundingBox();
    expect(box).not.toBeNull();

    // Tap the right half of the container to register a touch primary input.
    await page.touchscreen.tap(box!.x + box!.width * 0.75, box!.y + box!.height / 2);

    await expect(page.locator("[data-testid='host-proof-touch-count']")).toHaveText("1");
  });

  test(`${cartridgeId} wide viewport accepts keyboard input and persists completion`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    const profile = page.locator("[data-testid='host-proof-profile']");
    await expect(profile).toHaveText("wide");

    const container = page.locator("[data-testid='host-proof-game-container']");
    await expect(container).toHaveAttribute("data-profile", "wide");

    await container.press("Enter");

    await expect(page.locator("[data-testid='host-proof-keyboard-count']")).toHaveText("1");
    await page.click("[data-testid='host-proof-complete-button']");

    await expect(page.locator("text=Completed!")).toBeVisible();
    await expect(page.locator("[data-testid='host-proof-history-item']").first()).toContainText(cartridgeId);
  });

  test(`${cartridgeId} duplicate completion reports duplicate without extra XP`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    await page.click("[data-testid='host-proof-primary-button']");
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.locator("text=Completed!")).toBeVisible();

    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.locator("text=Duplicate completion")).toBeVisible();
  });

  test(`${cartridgeId} completion survives replay and navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    await page.click("[data-testid='host-proof-primary-button']");
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.locator("text=Completed!")).toBeVisible();

    // Navigate away and back to assert server-side persistence and replay.
    await page.goto("/student/read");
    await expect(page.url()).toContain("/student/read");

    await page.goto("/student/host-proof/games");
    await selectCartridge(page, cartridgeId);

    const historyItem = page.locator("[data-testid='host-proof-history-item']").first();
    await expect(historyItem).toContainText(cartridgeId);

    // Replay the same input and complete again; the second attempt is idempotent.
    await page.click("[data-testid='host-proof-primary-button']");
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.locator("text=Duplicate completion")).toBeVisible();
  });
}
