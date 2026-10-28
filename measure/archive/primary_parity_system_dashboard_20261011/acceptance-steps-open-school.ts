import type { Page } from "playwright";

/**
 * Steps for the pair that opens a school from the schools table. The school id comes from the
 * environment variable PARITY_SCHOOL_ID (a school of the clone that has students); no id is stored here.
 * Legacy has no schools table, so it has no step.
 */
export async function legacy(_page: Page): Promise<void> {}

/**
 * Taps the row link of the school and waits for the admin dashboard of that school.
 * @param page The page of the SYSTEM session, on `/system/dashboard`.
 * @throws When PARITY_SCHOOL_ID is not set, or when the page has no link for that school.
 */
export async function newApp(page: Page): Promise<void> {
  const id = process.env.PARITY_SCHOOL_ID;
  if (!id) throw new Error("PARITY_SCHOOL_ID is not set");
  const link = page.locator(`a[href*="/admin/dashboard?school=${encodeURIComponent(id)}"]:visible`).first();
  await link.click();
  await page.waitForURL((url) => url.searchParams.get("school") === id && url.pathname.endsWith("/admin/dashboard"));
  await page.waitForLoadState("load");
}

export { newApp as new };
