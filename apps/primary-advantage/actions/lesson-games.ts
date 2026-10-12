"use server";

import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { getLessonPracticeInput, type LessonPracticeInputRequest } from "@reading-advantage/domain/games";
import type { PracticeInput } from "@reading-advantage/game-contracts";
import { currentUser } from "@/lib/session";
import { logger } from "@/lib/observability/logger";

/** The result of the lesson game input action. */
export type LessonGameInputResult = { success: true; input: PracticeInput } | { success: false; error: string };

/**
 * Makes the game input (the words and sentences) of one lesson for the signed-in student, or for a
 * teacher who names the class book and the lesson number. The caller gates each game with
 * `missingFor(manifest, input)`. The domain function checks the school and the class book.
 * @param request The article, the locale, and for a teacher the class book and the lesson number.
 * @returns The input, or a short error; the detail goes to the log.
 */
export async function getLessonGameInputAction(request: LessonPracticeInputRequest): Promise<LessonGameInputResult> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  try {
    const tenant = { schoolId: user.schoolId };
    const input = await getLessonPracticeInput({ db: createTenantDB(db, tenant), user, tenant, input: request });
    return { success: true, input };
  } catch (error) {
    logger.error("lesson_game_input_failed", { error, userId: user.id, articleId: request?.articleId });
    return { success: false, error: "Lesson game input failed" };
  }
}
