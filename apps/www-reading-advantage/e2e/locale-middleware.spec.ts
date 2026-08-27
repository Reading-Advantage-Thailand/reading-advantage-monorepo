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

test.describe("Blog pagination routes", () => {
  for (const [locale, title] of [
    ["en", "Blog - Page 2"],
    ["th", "บล็อก - หน้า 2"],
    ["zh", "博客 - 第 2 页"],
  ] as const) {
    test(`serves page two content for ${locale}`, async ({ request }) => {
      const response = await request.get(`/${locale}/blog/page/2`);

      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(title);
    });
  }

  test("permanently redirects Chinese page one", async ({ request }) => {
    const response = await request.get("/zh/blog/page/1", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/zh/blog");
  });
});
