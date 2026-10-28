import type { Page } from "playwright";

/**
 * Check A1: selects the school choice on the landing and waits for the sign-in page.
 * The sign-in page must carry the return path (`callbackUrl`) of the lesson link.
 * The legacy app has no landing, so it has no steps.
 */
export async function openSchoolChoice(page: Page): Promise<void> {
  await page.locator('[data-landing] a[href*="/auth/signin"]').first().click();
  await page.waitForURL((u) => u.pathname.endsWith("/auth/signin") && u.searchParams.has("callbackUrl"), { timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Steps for the new app. */
export { openSchoolChoice as new };
