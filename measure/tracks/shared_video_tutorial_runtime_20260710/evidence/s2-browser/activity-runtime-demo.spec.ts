import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test("desktop checkpoint, remediation, transcript, and persistence flow", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/en/activity-runtime-demo");
  await expect(page.getByRole("heading", { name: "I Do: interactive commit demonstration" })).toBeVisible();
  await expect(page.getByTitle("Git commit tutorial video")).toHaveAttribute("src", /youtube\.com\/embed\/RGOj5yH7evk/);
  await page.screenshot({ path: "desktop-initial.png", fullPage: true });

  const play = page.getByRole("button", { name: "Play" });
  await play.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  const seek = page.getByRole("slider", { name: "Seek tutorial video" });
  await seek.focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("group", { name: "What does git add do?" })).toBeVisible();
  await expect(page.getByLabel("Stages changes")).toBeFocused();
  await page.screenshot({ path: "desktop-checkpoint.png", fullPage: true });

  await page.getByLabel("Publishes changes").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  const feedback = page.locator('[data-slot="interactive-activity-player"] span[role="status"]');
  await expect(feedback).toContainText("Not yet");
  await expect(page.locator('form').getByRole("img", { name: "Working tree flows to staging area, then to repository" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay Stage files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue video" })).toBeEnabled();
  await expect(page.getByText("Persisted attempts: 1")).toBeVisible();
  await page.screenshot({ path: "desktop-remediation.png", fullPage: true });

  await page.getByRole("button", { name: "Replay Stage files" }).click();
  await page.getByLabel("Stages changes").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(feedback).toContainText("Correct");
  await expect(page.getByText("Persisted attempts: 2")).toBeVisible();

  await page.getByRole("button", { name: "Show transcript" }).click();
  await expect(page.getByText(/Use git add to move changes/)).toBeVisible();
  await page.getByRole("button", { name: "Continue video" }).click();
  await expect(page.getByRole("group", { name: "What does git add do?" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Persisted attempts: 2")).toBeVisible();
  await expect(page.getByText(/Persisted position: 12 seconds/)).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("mobile touch targets and reduced-motion state remain usable", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/en/activity-runtime-demo");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await expect(page.locator('[data-slot="interactive-activity-player"]')).toHaveAttribute("data-reduced-motion", "true");

  const playBox = await page.getByRole("button", { name: "Play" }).boundingBox();
  expect(playBox?.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("slider", { name: "Seek tutorial video" }).focus();
  await page.keyboard.press("End");
  const checkBox = await page.getByRole("button", { name: "Check answer" }).boundingBox();
  const continueBox = await page.getByRole("button", { name: "Continue video" }).boundingBox();
  expect(checkBox?.height).toBeGreaterThanOrEqual(44);
  expect(continueBox?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: "mobile-reduced-motion.png", fullPage: true });
  await context.close();
});
