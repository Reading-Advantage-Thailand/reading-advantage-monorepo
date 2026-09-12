import { expect, type Locator, type Page } from "@playwright/test";
import type { VocabularyInput } from "@reading-advantage/game-contracts";

import { completePublicBespokeCartridge } from "./public-cartridge-drivers";

/** Route values required by the real authenticated Magic Defense lifecycle. */
export interface AuthenticatedMagicDefenseLifecycleOptions {
  /** Production student cartridge route. */
  readonly gamePath: string;
  /** Production student catalog route used by Exit. */
  readonly catalogPath: string;
}

/** Enters scored play directly from the standard briefing. */
const enterScoredPlay = async (page: Page): Promise<Locator> => {
  const briefing = page.getByRole("dialog", { name: "Magic Defense" });
  await expect(briefing).toBeVisible();
  await briefing.getByRole("button", { name: "Play now", exact: true }).click();
  const canvas = page.locator("[data-apk-canvas-host] canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();
  return canvas;
};

/** Completes one attempt and returns its saved activity identity. */
const completeAttempt = async (
  page: Page,
  canvas: Locator,
  content: VocabularyInput,
): Promise<string> => {
  const completionResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/apk/complete")
      && response.request().method() === "POST",
  );
  await completePublicBespokeCartridge(page, canvas, "Magic Defense", "magic-defense", content);
  await expect(page.getByText("Game complete", { exact: true })).toBeVisible();
  const completionResponse = await completionResponsePromise;
  expect(completionResponse.ok()).toBe(true);
  const result = await completionResponse.json() as Record<string, unknown>;
  expect(result).toMatchObject({
    duplicate: false,
    status: 200,
    activityId: expect.stringMatching(/^game:magic-defense:/u),
    xpEarned: expect.any(Number),
  });
  return String(result.activityId);
};

/** Validates the vocabulary fields required by the browser driver. */
const readVocabularyContent = (candidate: unknown): VocabularyInput => {
  if (!Array.isArray(candidate) || candidate.length === 0 || candidate.some((item) => (
    typeof item !== "object"
    || item === null
    || !("term" in item)
    || typeof item.term !== "string"
    || !("translation" in item)
    || typeof item.translation !== "string"
  ))) {
    throw new Error("Authenticated vocabulary content is invalid");
  }
  return candidate as VocabularyInput;
};

/**
 * Verifies the real authenticated Magic Defense content, save, Replay, and Exit lifecycle.
 * @param page Authenticated browser page for one application.
 * @param options Production route paths for the application.
 * @returns A promise resolved after Exit reaches the student catalog.
 */
export async function verifyAuthenticatedMagicDefenseLifecycle(
  page: Page,
  options: AuthenticatedMagicDefenseLifecycleOptions,
): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const warmCompletionRoute = await page.context().request.post("/api/v1/apk/complete", { data: {} });
  expect(warmCompletionRoute.status()).toBe(400);
  const contentResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/v1/apk/content?mode=vocabulary"),
  );
  await page.goto(options.gamePath);
  const contentResponse = await contentResponsePromise;
  expect(contentResponse.ok()).toBe(true);
  const responseBody = await contentResponse.json() as Record<string, unknown>;
  expect(responseBody).toMatchObject({ mode: "vocabulary", source: "student-flashcards" });
  const content = readVocabularyContent(responseBody.content);
  expect(content).toEqual(expect.arrayContaining([
    { term: "bridge", translation: "สะพาน" },
    { term: "forest", translation: "ป่า" },
    { term: "lantern", translation: "โคมไฟ" },
    { term: "river", translation: "แม่น้ำ" },
  ]));
  const firstCanvas = await enterScoredPlay(page);
  const firstActivityId = await completeAttempt(page, firstCanvas, content);
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(0);

  const replayCanvas = await enterScoredPlay(page);
  const replayActivityId = await completeAttempt(page, replayCanvas, content);
  expect(replayActivityId).not.toBe(firstActivityId);

  const [{ db, inArray }, { gameCompletions }] = await Promise.all([
    import("@reading-advantage/db"),
    import("@reading-advantage/db/schema"),
  ]);
  const savedReceipts = await db
    .select({ activityId: gameCompletions.activityId })
    .from(gameCompletions)
    .where(inArray(gameCompletions.activityId, [firstActivityId, replayActivityId]));
  expect(savedReceipts.map(({ activityId }) => activityId).sort()).toEqual(
    [firstActivityId, replayActivityId].sort(),
  );

  await page.getByRole("button", { name: "Exit", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${options.catalogPath.replaceAll("/", "\\/")}/?$`, "u"));
}
