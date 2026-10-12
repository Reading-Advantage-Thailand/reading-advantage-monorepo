import type { Page } from "playwright";

/**
 * Legacy steps. The legacy row has no working link (behavior contract section 2), so nothing is tapped.
 * @param _page The page of the TEACHER session.
 */
export async function legacy(_page: Page): Promise<void> {}

/**
 * Taps the class name link of the table on the new teacher home and waits for the class page.
 * The link goes to `/teacher/class-roster/<id>`. When PARITY_NEW_CLASS_ID is set, the link of that class is
 * tapped; else the first class link is tapped.
 * @param page The page of the TEACHER session.
 * @throws When the table has no class link.
 */
export async function newApp(page: Page): Promise<void> {
  const id = process.env.PARITY_NEW_CLASS_ID;
  const sel = id ? `a[href$="/teacher/class-roster/${id}"]` : 'a[href*="/teacher/class-roster/"]:not([href*="#"]):not([href*="/qr-cards"])';
  const link = page.locator(sel).first();
  if (!(await link.count())) throw new Error("no class link in the table");
  await Promise.all([page.waitForURL(/\/teacher\/class-roster\//, { timeout: 30000 }), link.click()]);
  await page.waitForLoadState("load");
}

export { newApp as new };
