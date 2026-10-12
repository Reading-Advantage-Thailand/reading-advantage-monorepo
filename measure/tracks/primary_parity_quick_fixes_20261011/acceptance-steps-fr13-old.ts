import type { Page } from "playwright";

/** Opens the sign-in page with the `classroom_code` query. The code comes from the environment, never from the repository. */
async function openWithCode(page: Page): Promise<void> {
  const code = process.env.PARITY_OLD_CLASS_CODE;
  if (!code) throw new Error("PARITY_OLD_CLASS_CODE is not set");
  const url = new URL(page.url());
  url.searchParams.set("classroom_code", code);
  await page.goto(url.toString());
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Steps for the legacy app. */
export const legacy = openWithCode;
/** Steps for the new app. */
export { openWithCode as new };
