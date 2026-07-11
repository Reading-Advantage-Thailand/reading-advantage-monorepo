import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const e2eForkRoot = process.env.CODECAMP_E2E_FORK_ROOT ?? "/tmp/codecamp-e2e-forks";
const validCartridge = "export const cartridgeManifest = { id: 'apk.e2e.guided', title: 'E2E Guided APK', description: 'Browser acceptance cartridge.', version: '1.0.0', runtimeApiVersion: '1.0.0', inputMode: 'vocabulary', requiredAssetSlots: ['background'], capabilities: ['keyboard'] } as const;";
const fakeDigest = `sha256:${"0".repeat(64)}`;
const localCheckerResult = {
  schemaVersion: "activity-tutorial-result.v1", repositoryId: "repo.apk.guided", activityId: "codecamp.activity.apk.wedo",
  stepId: "wedo.apk.manifest", passed: false, checkedAt: "2026-07-11T00:00:00Z", evidenceDigest: fakeDigest,
  checks: [{ checkId: "manifest.shape", passed: false, evidenceDigest: fakeDigest }, { checkId: "result.shape", passed: false, evidenceDigest: fakeDigest }, { checkId: "git.clean", passed: false, evidenceDigest: fakeDigest }],
};

test.beforeAll(() => {
  const work = join(e2eForkRoot, "work");
  const bare = join(e2eForkRoot, "admin", "reading-advantage-monorepo.git");
  rmSync(e2eForkRoot, { recursive: true, force: true });
  mkdirSync(join(work, "packages/codecamp-knowledge/fixtures/apk-guided/src"), { recursive: true });
  writeFileSync(join(work, "packages/codecamp-knowledge/fixtures/apk-guided/src/cartridge.ts"), validCartridge);
  writeFileSync(join(work, "packages/codecamp-knowledge/fixtures/apk-guided/src/game-state.ts"), "export const educationalResult = { objectiveId: 'codecamp.game-development.skill.apk-contract', correct: true, attempts: 1 } as const;\n");
  execFileSync("git", ["init"], { cwd: work });
  execFileSync("git", ["config", "user.email", "codecamp-e2e@example.invalid"], { cwd: work });
  execFileSync("git", ["config", "user.name", "Codecamp E2E"], { cwd: work });
  execFileSync("git", ["add", "."], { cwd: work });
  execFileSync("git", ["commit", "-m", "test fixture"], { cwd: work });
  mkdirSync(join(e2eForkRoot, "admin"), { recursive: true });
  execFileSync("git", ["clone", "--bare", work, bare]);
});

async function login(page: Page) {
  const loginButton = page.getByRole("button", { name: /^(Log in|เข้าสู่ระบบ)$/ });
  const logoutButton = page.getByRole("button", { name: /^(Log out|ออกจากระบบ)$/ });
  await expect(loginButton.or(logoutButton)).toBeVisible({ timeout: 30_000 });
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.locator("#username").fill(process.env.CODECAMP_E2E_USERNAME ?? "admin");
    const password = page.locator("#password");
    await password.fill(process.env.CODECAMP_E2E_PASSWORD ?? "Password123");
    await page.getByRole("dialog").locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(logoutButton).toBeVisible({ timeout: 30_000 });
    const retryAccess = page.getByRole("button", { name: /^(Check access again|ตรวจสิทธิ์อีกครั้ง)$/ });
    if (await retryAccess.isVisible()) await retryAccess.click();
  }
}

test.describe("published APK unit", () => {
  test.setTimeout(120_000);

  test("persists a server-assessed I Do checkpoint across reload", async ({ page }) => {
    await page.goto("/en/apk-unit/1");
    await login(page);
    await expect(page.getByRole("heading", { name: "Trace a Phaser cartridge" })).toBeVisible();
    await page.getByRole("button", { name: "Use transcript/diagram alternative — open checkpoint" }).click();
    await page.getByRole("radio", { name: "Persist the validated result" }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct — persistence stays at the host boundary.")).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await expect(page.getByText(/Server-restored assessment: passed/)).toBeVisible({ timeout: 30_000 });
  });

  test("persists We Do support and exposes the recoverable verified-report flow", async ({ page }) => {
    await page.goto("/en/apk-unit/2");
    await login(page);
    await expect(page.getByRole("heading", { name: "Complete the APK manifest" })).toBeVisible({ timeout: 30_000 });
    const supportSummary = page.getByText(/Server-restored support use: hints \d+; reveals \d+/);
    await expect(supportSummary).toBeVisible();
    const before = await supportSummary.textContent();
    const hintsBefore = Number(before?.match(/hints (\d+)/)?.[1] ?? -1);
    await page.getByRole("button", { name: "Show next hint" }).click();
    await page.reload();
    await expect(page.getByText(new RegExp(`Server-restored support use: hints ${hintsBefore + 1}`))).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "1. Prepare a fresh snapshot" })).toBeVisible();
    await expect(page.getByText(/tutorial-check --step wedo.apk.manifest/)).toBeVisible();
    await page.getByRole("button", { name: "1. Prepare a fresh snapshot" }).click();
    await expect(page.getByText(/Snapshot prepared:/)).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("tutorial-check JSON").fill(JSON.stringify(localCheckerResult));
    const reportPattern = "**/api/trpc/activity.reportTutorial*";
    await page.route(reportPattern, (route) => route.abort("internetdisconnected"), { times: 1 });
    await page.getByRole("button", { name: "2. Re-verify and store on server" }).click();
    await expect(page.getByText(/queued|fetch|network/i)).toBeVisible({ timeout: 30_000 });
    await page.unroute(reportPattern);
    await page.evaluate(() => globalThis.dispatchEvent(new Event("online")));
    await expect(page.getByText("Evidence stored")).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await expect(page.getByText(/Server-restored support use:/)).toBeVisible({ timeout: 30_000 });
  });

  test("bounds invalid stages and localizes independent transfer", async ({ page }) => {
    await page.goto("/th/apk-unit/3");
    await login(page);
    await expect(page.getByRole("heading", { name: "สร้างเกมเรียงประโยค" })).toBeVisible();
    await expect(page.getByText("วัตถุประสงค์การเรียนรู้และการแมปผลลัพธ์ถูกต้อง")).toBeVisible();
    await page.goto("/en/apk-unit/99");
    await expect(page.getByRole("heading", { name: "Lesson not found" })).toBeVisible();
  });
});
