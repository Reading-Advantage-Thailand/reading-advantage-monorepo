import type { Page } from "playwright";

/**
 * Check A3: opens the progress drill-down of the first student from the class page.
 * The new app only: legacy has no attempt history. Run A1, A2, and A4 first, so that attempt 1 exists.
 */
export async function openStudentDrillDown(page: Page): Promise<void> {
  const card = page.locator("[data-class-book-slot]").first();
  await card.waitFor({ timeout: 30000 });
  await card.getByRole("link", { name: /progress/i }).first().click();
  await page.waitForURL((u) => /\/progress$/.test(u.pathname), { timeout: 30000 });
  await page.locator("table a").first().click();
  await page.waitForURL((u) => /\/progress\/[^/]+$/.test(u.pathname), { timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/**
 * Check A4: presses "Teach again" on a taught lesson of the lesson plan and confirms.
 * Run it on a scratch copy of the rehearsal database: it moves the work of the class into the history.
 */
export async function teachAgain(page: Page): Promise<void> {
  const card = page.locator("[data-class-book-slot]").first();
  await card.waitFor({ timeout: 30000 });
  await card.getByRole("link", { name: /lesson plan|open book/i }).first().click();
  await page.getByRole("button", { name: "Teach again" }).first().click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Teach again" }).click();
  await page.getByText(/Run 2/).first().waitFor({ timeout: 30000 });
}

/** Steps for the new app. */
export { openStudentDrillDown as new };
