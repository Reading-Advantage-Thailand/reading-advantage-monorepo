import type { Page } from "playwright";

/**
 * Opens the first class book that the staff member manages, from the notices on the student home.
 * The legacy app has no class books, so it has no steps.
 */
export async function openFirstManagedBook(page: Page): Promise<void> {
  const link = page.locator('a[href*="/student/books/"]').first();
  await link.waitFor({ timeout: 30000 });
  await link.click();
  await page.waitForURL((u) => /\/student\/books\/[^/]+/.test(u.pathname), { timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Steps for the new app. */
export { openFirstManagedBook as new };
