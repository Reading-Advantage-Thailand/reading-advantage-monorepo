"use server";

import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  getLessonGameResults,
  getLessonPracticeInput,
  listPrimarySamplePracticeInput,
  type LessonGameResults,
  type LessonGameResultsRequest,
  type LessonPracticeInputRequest,
} from "@reading-advantage/domain/games";
import type { PracticeInput } from "@reading-advantage/game-contracts";
import { currentUser } from "@/lib/session";
import { studentViewModeFor } from "@/lib/student-view";
import { logger } from "@/lib/observability/logger";

/** The result of the lesson game input action. */
export type LessonGameInputResult = { success: true; input: PracticeInput } | { success: false; error: string };

/**
 * Makes the game input (the words and sentences) of one lesson for the signed-in student, or for a
 * teacher who names the class book and the lesson number. The caller gates each game with
 * `missingFor(manifest, input)`. The domain function checks the school and the class book. Staff in
 * a rehearsal or a preview name no book: they get the read-only sample set, so the games run in the
 * demo mode and no row of any user is read or saved.
 * @param request The article, the locale, and for a teacher the class book and the lesson number.
 * @returns The input, or a short error; the detail goes to the log.
 */
export async function getLessonGameInputAction(request: LessonPracticeInputRequest): Promise<LessonGameInputResult> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  try {
    if (studentViewModeFor(user.role) === "preview" && !request.classBookId) {
      // Preview (staff): the same read-only sample the practice route gives (defect fix 2026-10-12).
      const sample = await listPrimarySamplePracticeInput({ db, input: { locale: request.locale } });
      return { success: true, input: sample };
    }
    const tenant = { schoolId: user.schoolId };
    const input = await getLessonPracticeInput({ db: createTenantDB(db, tenant), user, tenant, input: request });
    return { success: true, input };
  } catch (error) {
    logger.error("lesson_game_input_failed", { error, userId: user.id, articleId: request?.articleId });
    return { success: false, error: "Lesson game input failed" };
  }
}

/** The result of the lesson game results action. */
export type LessonGameResultsResult = { success: true; results: LessonGameResults } | { success: false; error: string };

/**
 * Reads the latest saved run of each game for one lesson article, and the total game XP of the
 * article, for the signed-in user. The domain function scopes the read to the user and the school.
 * Staff in a rehearsal or a preview read no row: they get the empty set, for symmetry with the
 * input action, so the games render with no history and nothing is saved.
 * @param request The article of the lesson.
 * @returns The results, or a short error; the detail goes to the log.
 */
export async function getLessonGameResultsAction(request: LessonGameResultsRequest): Promise<LessonGameResultsResult> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  try {
    if (studentViewModeFor(user.role) === "preview") {
      return { success: true, results: { latest: [], totalXp: 0 } };
    }
    const tenant = { schoolId: user.schoolId };
    const results = await getLessonGameResults({ db: createTenantDB(db, tenant), user, tenant, input: request });
    return { success: true, results };
  } catch (error) {
    logger.error("lesson_game_results_failed", { error, userId: user.id, articleId: request?.articleId });
    return { success: false, error: "Lesson game results failed" };
  }
}
