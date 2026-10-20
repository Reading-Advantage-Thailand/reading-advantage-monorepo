import type { Page } from "playwright";
import { openFirstManagedBook } from "./acceptance-steps-student-view-book.ts";

/**
 * Opens the first lesson of the first class book that the staff member manages.
 * The legacy app has no class book lessons, so it has no steps.
 */
export async function openFirstBookLesson(page: Page): Promise<void> {
  await openFirstManagedBook(page);
  const link = page.locator('a[href*="/student/lesson/"]').first();
  await link.waitFor({ timeout: 30000 });
  await link.click();
  await page.waitForURL((u) => /\/student\/lesson\/[^/]+/.test(u.pathname), { timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Steps for the new app. */
export { openFirstBookLesson as new };
