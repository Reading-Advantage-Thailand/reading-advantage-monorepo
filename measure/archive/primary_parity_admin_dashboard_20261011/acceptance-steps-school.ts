import type { Page } from "playwright";

/**
 * Steps for the SYSTEM pairs that pick a school. The school id comes from the environment variable
 * PARITY_SCHOOL_ID (a school of the clone that has activity); no id is stored in this file.
 * The new app takes the school from the `school` query value. Legacy has a picker and no URL value.
 */
export async function legacy(_page: Page): Promise<void> {}

/**
 * Adds `school=<PARITY_SCHOOL_ID>` to the URL of the page and opens it again.
 * @param page The page of the SYSTEM session.
 * @throws When PARITY_SCHOOL_ID is not set.
 */
export async function newApp(page: Page): Promise<void> {
  const id = process.env.PARITY_SCHOOL_ID;
  if (!id) throw new Error("PARITY_SCHOOL_ID is not set");
  const url = new URL(page.url());
  url.searchParams.set("school", id);
  await page.goto(url.toString(), { waitUntil: "load" });
}

export { newApp as new };
