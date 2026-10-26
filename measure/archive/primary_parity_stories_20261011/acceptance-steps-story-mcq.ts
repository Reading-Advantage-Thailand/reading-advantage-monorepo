import type { Page } from "playwright";
import { readXp, recordLine } from "./acceptance-steps-stories.ts";

/**
 * Clicks the first option button that is not a flow button (Next, Finish, Retake, player).
 * Legacy shows one MCQ at a time with kid-friendly option buttons in an option grid.
 * @param page The legacy chapter page on one MCQ.
 * @throws When no option button is found.
 */
async function clickFirstOption(page: Page): Promise<void> {
  const buttons = page.locator("div.grid button:not(:disabled)");
  const n = await buttons.count();
  for (let i = 0; i < n; i++) {
    const name = (await buttons.nth(i).innerText().catch(() => "")).replace(/\s+/g, " ");
    if (!/next|finish|retake|submit|play|pause|listen|translat|word list|🏁|→/i.test(name)) {
      await buttons.nth(i).click();
      return;
    }
  }
  throw new Error("recordMcqXp: no MCQ option button found");
}

/**
 * ST-A4: records XP, answers the 5 MCQ with the first option, submits, retakes, and
 * submits again. The new app shows all questions with radios and one Submit; legacy shows
 * one question at a time with option buttons and Next/Finish. Each round appends its XP
 * record to the page, so the capture text holds XP before and after. An already-done
 * chapter (a rerun) retakes first; the record line says so.
 * @param page The chapter page.
 */
export async function recordMcqXp(page: Page): Promise<void> {
  for (let round = 1; round <= 2; round++) {
    const before = await readXp(page);
    let radios = await page.locator('fieldset input[type="radio"]').count();
    let retakenFirst = false;
    if (radios === 0) {
      const retake = page.getByRole("button", { name: /retake/i }).first();
      if ((await retake.count()) > 0) {
        await retake.click();
        await page.waitForLoadState("networkidle").catch(() => {});
        radios = await page.locator('fieldset input[type="radio"]').count();
        retakenFirst = true;
      }
    }
    if (radios > 0) {
      const sets = page.locator("fieldset");
      for (let i = 0; i < (await sets.count()); i++) {
        await sets.nth(i).locator('input[type="radio"]:not(:disabled)').first().check();
      }
      await page.getByRole("button", { name: /^submit$/i }).first().click();
    } else {
      for (let q = 0; q < 5; q++) {
        await clickFirstOption(page);
        const finish = page.getByRole("button", { name: /finish|🏁/i }).first();
        if ((await finish.count()) > 0) await finish.click();
        else await page.getByRole("button", { name: /next|→/i }).first().click();
      }
    }
    await page.getByText(/of 5|XP/i).first().waitFor({ timeout: 60000 });
    const after = await readXp(page);
    const result =
      /Done: \d+ of \d+|\+\d[\d,]*\s*XP/i.exec(await page.locator("main").innerText().catch(() => ""))?.[0] ??
      "result unshown";
    await recordLine(
      page,
      `MCQ round ${round}${retakenFirst ? " (retake first, chapter was done)" : ""}: XP before ${before}; ${result}; XP after ${after}.`,
    );
    if (round === 1) {
      await page.getByRole("button", { name: /retake/i }).first().click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }
}

/** Steps for the legacy app. */
export { recordMcqXp as legacy };
/** Steps for the new app. */
export { recordMcqXp as new };
