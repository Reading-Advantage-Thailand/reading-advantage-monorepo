import { test, expect } from "@playwright/test";

test.describe("Contact Page", () => {
  test("navigates to contact page and shows email contact link", async ({
    page,
  }) => {
    await page.goto("/en/contact");
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
  });
});
