# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apk-unit-production.spec.ts >> published APK unit >> persists a server-assessed I Do checkpoint across reload
- Location: e2e/apk-unit-production.spec.ts:18:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3200/en/apk-unit/1", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test, type Page } from "@playwright/test";
  2  | 
  3  | async function login(page: Page) {
  4  |   const loginButton = page.getByRole("button", { name: "Log in", exact: true });
  5  |   await page.waitForFunction(() => document.body.innerText.includes("Log in") || document.body.innerText.includes("Log out"));
  6  |   if (await loginButton.isVisible()) {
  7  |     await loginButton.click();
  8  |     await page.getByRole("textbox", { name: "Username" }).fill(process.env.CODECAMP_E2E_USERNAME ?? "admin");
  9  |     await page.getByRole("textbox", { name: "Password" }).fill(process.env.CODECAMP_E2E_PASSWORD ?? "Password123");
  10 |     await page.getByRole("dialog").getByRole("button", { name: "Log in", exact: true }).click();
  11 |     await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  12 |     const retryAccess = page.getByRole("button", { name: "Check access again" });
  13 |     if (await retryAccess.isVisible()) await retryAccess.click();
  14 |   }
  15 | }
  16 | 
  17 | test.describe("published APK unit", () => {
  18 |   test("persists a server-assessed I Do checkpoint across reload", async ({ page }) => {
> 19 |     await page.goto("/en/apk-unit/1");
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  20 |     await login(page);
  21 |     await expect(page.getByRole("heading", { name: "Trace a Phaser cartridge" })).toBeVisible();
  22 |     await page.getByRole("button", { name: "Use transcript/diagram alternative — open checkpoint" }).click();
  23 |     await page.getByRole("radio", { name: "Persist the validated result" }).check();
  24 |     await page.getByRole("button", { name: "Check answer" }).click();
  25 |     await expect(page.getByText("Correct — persistence stays at the host boundary.")).toBeVisible();
  26 |     await expect(page.getByText(/Server-restored assessment: passed/)).toBeVisible();
  27 |     await page.reload();
  28 |     await expect(page.getByText(/Server-restored assessment: passed/)).toBeVisible();
  29 |   });
  30 | 
  31 |   test("persists We Do support and exposes the recoverable verified-report flow", async ({ page }) => {
  32 |     await page.goto("/en/apk-unit/2");
  33 |     await login(page);
  34 |     await expect(page.getByRole("heading", { name: "Complete the APK manifest" })).toBeVisible();
  35 |     await page.getByRole("button", { name: "Show next hint" }).click();
  36 |     await expect(page.getByText(/Server-restored support use: hints 1/)).toBeVisible();
  37 |     await page.reload();
  38 |     await expect(page.getByText(/Server-restored support use: hints 1/)).toBeVisible();
  39 |     await expect(page.getByRole("button", { name: "1. Prepare a fresh snapshot" })).toBeVisible();
  40 |     await expect(page.getByText(/tutorial-check --step wedo.apk.manifest/)).toBeVisible();
  41 |   });
  42 | 
  43 |   test("bounds invalid stages and localizes independent transfer", async ({ page }) => {
  44 |     await page.goto("/th/apk-unit/3");
  45 |     await login(page);
  46 |     await expect(page.getByRole("heading", { name: "สร้างเกมเรียงประโยค" })).toBeVisible();
  47 |     await expect(page.getByText("วัตถุประสงค์การเรียนรู้และการแมปผลลัพธ์ถูกต้อง")).toBeVisible();
  48 |     await page.goto("/en/apk-unit/99");
  49 |     await expect(page.getByRole("heading", { name: "Lesson not found" })).toBeVisible();
  50 |   });
  51 | });
  52 | 
```