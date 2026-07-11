import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  process.cwd(),
  "../../measure/tracks/shared_video_tutorial_runtime_20260710/browser-evidence",
);

test("completes the interactive video, remediation, and persisted resume loop", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const response = await page.goto("/en/activity-runtime-demo");
  const contentSecurityPolicy = response?.headers()["content-security-policy"];
  expect(contentSecurityPolicy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com");
  expect(contentSecurityPolicy).toContain("frame-src https://www.youtube.com");
  await expect(page.getByTitle("Git commit tutorial video")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(page.locator('[data-slot="activity-alternative"]').getByRole("img", { name: "Working tree flows to staging area, then to repository" })).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, `s2-${testInfo.project.name}-initial.png`) });

  await page.getByRole("button", { name: "Play" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("slider", { name: "Seek tutorial video" }).fill("36");
  await expect(page.getByRole("group", { name: "What does git add do?" })).toBeVisible();
  await expect(page.getByLabel("Stages changes")).toBeFocused();
  await expect(page.locator('[data-slot="activity-remediation-resources"]').getByRole("img", { name: "Working tree flows to staging area, then to repository" })).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, `s2-${testInfo.project.name}-checkpoint.png`) });

  await page.getByLabel("Publishes changes").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator('[data-slot="interactive-activity-player"] [role="status"]')).toContainText("Not yet");
  await expect(page.getByText("Persisted attempts: 1")).toBeVisible();
  await page.getByRole("button", { name: "Replay Stage files" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.getByLabel("Stages changes").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator('[data-slot="interactive-activity-player"] [role="status"]')).toContainText("Correct");
  await expect(page.getByText("Persisted attempts: 2")).toBeVisible();
  await page.getByRole("button", { name: "Show transcript" }).click();
  await expect(page.getByText("Use git add to move changes")).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, `s2-${testInfo.project.name}-remediation-correct.png`) });

  await page.getByRole("button", { name: "Continue video" }).click();
  await page.getByRole("slider", { name: "Seek tutorial video" }).fill("24");
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("watched batches: 1")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("slider", { name: "Seek tutorial video" })).toHaveValue("24", { timeout: 15_000 });
  await expect(page.getByText(/Persisted position: 24 seconds/)).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: resolve(evidenceDirectory, `s2-${testInfo.project.name}-resumed.png`) });
});

test("honors reduced motion and exposes touch-sized controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/activity-runtime-demo");
  await expect(page.locator('[data-slot="interactive-activity-player"]')).toHaveAttribute("data-reduced-motion", "true");
  const touchControls = page.locator('[data-touch-target="true"]');
  expect(await touchControls.count()).toBeGreaterThan(0);
  const playBox = await page.getByRole("button", { name: "Play" }).boundingBox();
  expect(playBox?.height).toBeGreaterThanOrEqual(44);
  const overlappingHeaderControls = await page.locator("header.sticky").evaluate((header) => {
    const controls = [...header.querySelectorAll<HTMLElement>("a, button")]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    return controls.flatMap((left, index) => controls.slice(index + 1).filter((right) => (
      Math.min(left.right, right.right) > Math.max(left.left, right.left)
      && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top)
    ))).length;
  });
  expect(overlappingHeaderControls).toBe(0);
});

test("passes the Thai route locale into activity content and shared controls", async ({ page }) => {
  await page.goto("/th/activity-runtime-demo");
  await expect(page.getByRole("button", { name: "เล่น" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("slider", { name: "เลื่อนวิดีโอบทเรียน" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "I Do: สาธิตการสร้าง commit แบบโต้ตอบ" })).toBeVisible();
  await page.getByRole("slider", { name: "เลื่อนวิดีโอบทเรียน" }).fill("36");
  await expect(page.getByRole("group", { name: "git add ทำอะไร?" })).toBeVisible();
});
