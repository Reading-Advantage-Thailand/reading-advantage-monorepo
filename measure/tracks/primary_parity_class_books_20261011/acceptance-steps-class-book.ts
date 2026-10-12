import type { Page } from "playwright";

/**
 * Check A2: opens lesson 1 from the book card of the class page. The book must be assigned first
 * (the S2/S6 browser check does it). The legacy app has no book card, so it has no steps.
 */
export async function openLessonFromCard(page: Page): Promise<void> {
  const card = page.locator("[data-class-book-slot]").first();
  await card.waitFor({ timeout: 30000 });
  await card.getByRole("link", { name: "Open lesson" }).first().click();
  await page.waitForURL((u) => /\/lessons\/\d+$/.test(u.pathname), { timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Steps for the new app. */
export { openLessonFromCard as new };
