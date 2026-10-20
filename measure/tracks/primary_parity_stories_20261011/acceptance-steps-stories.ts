import type { Page } from "playwright";

/**
 * Reads the first "<number> XP" text on the page.
 * @param page The captured page.
 * @returns The XP text, or "unshown" when the header shows no XP.
 */
export async function readXp(page: Page): Promise<string> {
  const text = await page.locator("body").innerText().catch(() => "");
  return /[\d,]+\s*XP/i.exec(text)?.[0] ?? "unshown";
}

/**
 * Appends one evidence line to the main column, so the capture text holds the XP record.
 * @param page The captured page.
 * @param line The record line.
 */
export async function recordLine(page: Page, line: string): Promise<void> {
  await page.evaluate((text) => {
    const main = document.querySelector("main") ?? document.body;
    const p = document.createElement("p");
    p.setAttribute("data-xp-record", "true");
    p.textContent = text;
    main.appendChild(p);
  }, line);
}

/**
 * ST-A3: picks the Thai translation, then opens the word list.
 * The new app uses a language combobox; legacy uses a toggle button.
 * @param page The chapter page.
 */
export async function chapterAids(page: Page): Promise<void> {
  const combo = page.getByRole("combobox").first();
  if ((await combo.count()) > 0) {
    await combo.click();
    await page.getByRole("option", { name: /thai|ไทย/i }).first().click();
    const show = page.getByRole("button", { name: /translat/i }).first();
    if ((await show.count()) > 0 && (await show.isEnabled().catch(() => false))) {
      await show.click().catch(() => {});
    }
  } else {
    await page.getByRole("button", { name: /ไทย|thai/i }).first().click();
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("button", { name: /word list/i }).first().click();
  await page.locator('[role="dialog"]').first().waitFor({ timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Steps for the legacy app. */
export { chapterAids as legacy };
/** Steps for the new app. */
export { chapterAids as new };
