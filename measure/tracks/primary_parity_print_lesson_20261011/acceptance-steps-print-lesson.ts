import type { Page } from "playwright";

/**
 * Opens lesson 5 of the assigned class book from the book card of the class page. The book must
 * be assigned first (the class books browser check does it). The legacy app has no print page,
 * so these pairs have steps for the new app only.
 */
export async function openLessonFive(page: Page): Promise<void> {
  const card = page.locator("[data-class-book-slot]").first();
  await card.waitFor({ timeout: 30000 });
  await card.getByRole("link", { name: "Open lesson" }).first().click();
  await page.waitForURL((u) => /\/lessons\/\d+$/.test(u.pathname), { timeout: 30000 });
  const url = new URL(page.url());
  url.pathname = url.pathname.replace(/\/lessons\/\d+$/, "/lessons/5");
  await page.goto(url.toString());
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Check A2: opens the print page of lesson 5 and waits until the pictures load (Print is on). */
export async function openPrintPage(page: Page): Promise<void> {
  await openLessonFive(page);
  await page.getByRole("link", { name: "Print this lesson" }).click();
  await page.waitForURL((u) => /\/lessons\/5\/print$/.test(u.pathname), { timeout: 30000 });
  await page.getByRole("button", { name: "Print", exact: true }).waitFor({ timeout: 60000 });
}

/** Steps for the A1 pair (the new app). */
export { openLessonFive as new };
