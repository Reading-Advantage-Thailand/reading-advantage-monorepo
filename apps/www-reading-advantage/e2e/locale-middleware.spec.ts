import { test, expect } from "@playwright/test";

test.describe("Locale middleware", () => {
  test("redirects unprefixed URL with Accept-Language: th to /th/*", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "th-TH" });
    const page = await context.newPage();
    const response = await page.goto("/pricing");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/th\/pricing/);
    await context.close();
  });

  test("redirects unprefixed URL with no language preference to /en/*", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    const response = await page.goto("/pricing");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/en\/pricing/);
    await context.close();
  });

  test("does NOT redirect already-prefixed /th/* URL", async ({ page }) => {
    await page.goto("/th/about");
    await expect(page).toHaveURL(/\/th\/about/);
  });

  test("does NOT redirect _next static assets", async ({ page }) => {
    const response = await page.goto("/_next/static/some-path-that-404s", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.url()).toContain("/_next/static/");
  });

  test("does NOT redirect files with extensions (favicon)", async ({
    page,
  }) => {
    const response = await page.goto("/favicon.ico");
    expect(response?.url()).toContain("/favicon.ico");
  });
});
