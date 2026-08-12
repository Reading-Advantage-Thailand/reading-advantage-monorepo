import { expect, test, type Page } from "@playwright/test";

const username =
  process.env.PHASE5_MEDIA_TEST_USERNAME ?? process.env.CODECAMP_E2E_USERNAME;
const password =
  process.env.PHASE5_MEDIA_TEST_PASSWORD ?? process.env.CODECAMP_E2E_PASSWORD;
const hasCredentials = Boolean(username && password);

/**
 * Signs into CodeCamp when the media acceptance environment provides credentials.
 * @param page Browser page used for the authenticated flow.
 * @returns Resolves after the dashboard is available.
 */
async function login(page: Page): Promise<void> {
  await page.goto("/en/", { waitUntil: "domcontentloaded" });
  await page.locator("#dashboard-username").fill(username!);
  await page.locator("#dashboard-password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Overall Progress")).toBeVisible({ timeout: 30_000 });
}

test.describe("Phase 5 interactive media browser acceptance", () => {
  test.skip(
    !hasCredentials,
    "Set PHASE5_MEDIA_TEST_USERNAME and PHASE5_MEDIA_TEST_PASSWORD (or CODECAMP_E2E_USERNAME/CODECAMP_E2E_PASSWORD) to run the authenticated browser check.",
  );

  test("renders a seeded diagram and YouTube embed on a lesson page", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    await page.goto("/en/module/dev-environment", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Terminal, Node\.js, and pnpm/ }).click();

    const diagram = page.getByRole("img", { name: "Terminal Basics" });
    await expect(diagram).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => diagram.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);

    const video = page.locator('iframe[title="Terminal Basics"]');
    await expect(video).toBeVisible({ timeout: 30_000 });
    await expect(video).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/Ke90Tje7VS0",
    );
    await expect
      .poll(() =>
        page.frames().some((frame) =>
          frame.url().includes("youtube.com/embed/Ke90Tje7VS0"),
        ),
      )
      .toBe(true);
  });
});
