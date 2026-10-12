import type { Page } from "playwright";

/** No step for legacy. */
export async function legacy(_page: Page): Promise<void> {}

/**
 * Adds `school=<PARITY_OTHER_SCHOOL_ID>` (a school that is not the school of the ADMIN) to the URL
 * and opens it again. The id comes from the environment; no id is stored in this file.
 * @param page The page of the ADMIN session.
 * @throws When PARITY_OTHER_SCHOOL_ID is not set.
 */
export async function newApp(page: Page): Promise<void> {
  const id = process.env.PARITY_OTHER_SCHOOL_ID;
  if (!id) throw new Error("PARITY_OTHER_SCHOOL_ID is not set");
  const url = new URL(page.url());
  url.searchParams.set("school", id);
  await page.goto(url.toString(), { waitUntil: "load" });
}

export { newApp as new };
