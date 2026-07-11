import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  const loginButton = page.getByRole("button", { name: "Log in", exact: true });
  await expect(loginButton.or(page.getByRole("button", { name: "Log out" }))).toBeVisible();
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.getByRole("textbox", { name: "Username" }).fill(process.env.CODECAMP_E2E_USERNAME ?? "admin");
    const password = page.getByRole("textbox", { name: "Password" });
    await password.fill(process.env.CODECAMP_E2E_PASSWORD ?? "Password123");
    await password.press("Enter");
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    const retryAccess = page.getByRole("button", { name: "Check access again" });
    if (await retryAccess.isVisible()) await retryAccess.click();
  }
}

test.describe("published APK unit", () => {
  test.setTimeout(60_000);

  test("persists a server-assessed I Do checkpoint across reload", async ({ page }) => {
    await page.goto("/en/apk-unit/1");
    await login(page);
    await expect(page.getByRole("heading", { name: "Trace a Phaser cartridge" })).toBeVisible();
    await page.getByRole("button", { name: "Use transcript/diagram alternative — open checkpoint" }).click();
    await page.getByRole("radio", { name: "Persist the validated result" }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct — persistence stays at the host boundary.")).toBeVisible();
    await expect(page.getByText(/Server-restored assessment: passed/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Server-restored assessment: passed/)).toBeVisible();
  });

  test("persists We Do support and exposes the recoverable verified-report flow", async ({ page }) => {
    await page.goto("/en/apk-unit/2");
    await login(page);
    await expect(page.getByRole("heading", { name: "Complete the APK manifest" })).toBeVisible();
    await page.getByRole("button", { name: "Show next hint" }).click();
    await expect(page.getByText(/Server-restored support use: hints 1/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Server-restored support use: hints 1/)).toBeVisible();
    await expect(page.getByRole("button", { name: "1. Prepare a fresh snapshot" })).toBeVisible();
    await expect(page.getByText(/tutorial-check --step wedo.apk.manifest/)).toBeVisible();
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
