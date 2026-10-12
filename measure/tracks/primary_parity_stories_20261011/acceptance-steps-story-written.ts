import type { Page } from "playwright";
import { readXp, recordLine } from "./acceptance-steps-stories.ts";

/** A valid SAQ answer (about 150 characters). */
const SA_ANSWER =
  "The brave rabbit shares its food with hungry friends in the forest every day, so no one goes to bed hungry during the cold winter nights.";

/** A valid LAQ answer (about 450 characters, over level x 30 for any student level through 13). */
const LA_ANSWER =
  "The chapter shows that brave friends help each other when times are hard. First, the rabbit shares food even though winter is cold and supplies are low. " +
  "Second, the bird carries messages across the river so the group can plan together. Third, the turtle stays calm and thinks of a safe path home. " +
  "In the end, their kindness and teamwork save the day, and the forest feels warm again because everyone worked as one team.";

/**
 * ST-A5: records XP, fills a valid SAQ answer and a valid LAQ answer, and records XP again.
 * The steps do not ask for feedback and do not submit: the kit has no AI key, and both need
 * the AI score. The submit XP, the one-submit refusal, and the LAQ minimum are proven by the
 * domain and component tests; the batch runner confirms them with a headed pass.
 * @param page The chapter page.
 * @throws When the SAQ and LAQ boxes are not found.
 */
export async function recordWrittenXp(page: Page): Promise<void> {
  const before = await readXp(page);
  const boxes = page.locator("textarea:not(:disabled)");
  if ((await boxes.count()) < 2) throw new Error("recordWrittenXp: SAQ and LAQ boxes not found");
  await boxes.nth(0).fill(SA_ANSWER);
  await boxes.nth(1).fill(LA_ANSWER);
  await page.waitForLoadState("networkidle").catch(() => {});
  const after = await readXp(page);
  await recordLine(
    page,
    `Written: XP before ${before}; SAQ and LAQ answers filled, not submitted (the kit has no AI key); XP after ${after}.`,
  );
}

/** Steps for the legacy app. */
export { recordWrittenXp as legacy };
/** Steps for the new app. */
export { recordWrittenXp as new };
