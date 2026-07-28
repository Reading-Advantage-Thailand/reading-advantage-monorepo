import { test, expect } from "@playwright/test";

const CARTRIDGE_IDS = [
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "sorcerer-ziggurat",
  "astral-mage",
] as const;
const TEST_USERNAME = process.env.HOST_PROOF_TEST_USERNAME ?? "";
const TEST_PASSWORD = process.env.HOST_PROOF_TEST_PASSWORD ?? "";
const TEST_SESSION_TOKEN = process.env.HOST_PROOF_TEST_SESSION_TOKEN ?? "";
const VIEWPORTS = {
  compact: { width: 390, height: 844 },
  wide: { width: 1280, height: 800 },
} as const;
const INPUTS = ["keyboard", "pointer", "touch"] as const;

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  test.skip(
    !TEST_SESSION_TOKEN && (!TEST_USERNAME || !TEST_PASSWORD),
    "Set HOST_PROOF_TEST_SESSION_TOKEN or HOST_PROOF_TEST_USERNAME/PASSWORD",
  );

  if (TEST_SESSION_TOKEN) {
    await page.context().addCookies([
      { name: "session_token", value: TEST_SESSION_TOKEN, domain: "localhost", path: "/" },
    ]);
    return;
  }

  await page.goto("/auth/signin");
  await page.fill("#username", TEST_USERNAME);
  await page.fill("#password", TEST_PASSWORD);
  await page.click("button[name='signin-button']");
  await page.waitForURL("**/");
});

for (const cartridgeId of CARTRIDGE_IDS) {
  for (const [profileName, viewport] of Object.entries(VIEWPORTS)) {
    for (const input of INPUTS) {
      test(`${cartridgeId} accepts real ${input} input and persists completion in ${profileName}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto("/student/host-proof/games");
        await page.waitForSelector("[data-host-proof-boundary='reading-primary-host-proof-only']");
        await page.selectOption("select[aria-label='Select host-proof cartridge']", cartridgeId);

        const container = page.locator("[data-testid='host-proof-game-container']");
        await expect(container).toHaveAttribute("data-profile", profileName);

        if (input === "keyboard") {
          await container.press("Enter");
        } else {
          const box = await container.boundingBox();
          expect(box).not.toBeNull();
          const x = box!.x + box!.width * 0.75;
          const y = box!.y + box!.height / 2;
          if (input === "touch") {
            await page.touchscreen.tap(x, y);
          } else {
            await page.mouse.click(x, y);
          }
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
    await page.goto("/student/host-proof/games");
    await page.waitForSelector("[data-host-proof-boundary='reading-primary-host-proof-only']");
    await page.selectOption("select[aria-label='Select host-proof cartridge']", cartridgeId);
    await page.click("[data-testid='host-proof-primary-button']");
    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.getByText("Completed!")).toBeVisible();
    const historyCount = await page.locator("[data-testid='host-proof-history-item']").count();

    await page.click("[data-testid='host-proof-complete-button']");
    await expect(page.getByText("Duplicate completion recorded (no additional XP).")).toBeVisible();
    await expect(page.locator("[data-testid='host-proof-history-item']")).toHaveCount(historyCount);
  });
}
