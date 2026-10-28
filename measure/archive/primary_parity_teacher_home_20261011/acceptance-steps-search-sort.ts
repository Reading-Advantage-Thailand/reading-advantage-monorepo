import type { Page } from "playwright";

/**
 * Steps for the pair th-search-sort. The search text comes from the environment variable
 * PARITY_CLASS_SEARCH (part of a class name of the clone); no class name is stored in this file.
 * Both apps get the same actions: type in the search box, then tap "Students" in the table head.
 */
async function run(page: Page): Promise<void> {
  const text = process.env.PARITY_CLASS_SEARCH;
  if (!text) throw new Error("PARITY_CLASS_SEARCH is not set");
  const box = page.locator('input[type="search"], input[placeholder*="earch" i]').first();
  await box.fill(text);
  const head = page.getByRole("button", { name: /^students$/i }).first();
  if (await head.count()) {
    await head.click();
    await head.click();
  }
  await page.waitForTimeout(300);
}

/**
 * Legacy steps.
 * @param page The page of the TEACHER session.
 */
export async function legacy(page: Page): Promise<void> {
  await run(page);
}

/**
 * New app steps.
 * @param page The page of the TEACHER session.
 */
export async function newApp(page: Page): Promise<void> {
  await run(page);
}

export { newApp as new };
