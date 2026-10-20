"use server";

import { db } from "@reading-advantage/db";
import { restartLesson, restartLessonInput, type RestartLessonInput } from "@reading-advantage/domain/primary-lesson-attempts";
import { currentUser } from "@/lib/session";
import { logger } from "@/lib/observability/logger";
import { guardStudentAction, type PreviewActionResult } from "@/lib/student-view";

/** The result of starting a lesson again: the new attempt number, or an error. */
export type RestartLessonActionState =
  | { success: true; closed: boolean; attemptNumber: number | null }
  | { success: false; error: string };

/**
 * Starts the lesson again for the signed-in student: the current attempt goes into the history.
 * @param input The article id and the optional assignment id.
 * @returns The new attempt number, the error, or the preview result for staff (nothing saved).
 */
export async function restartLessonAction(input: RestartLessonInput): Promise<RestartLessonActionState | PreviewActionResult> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const preview = guardStudentAction(user, "restart_lesson");
  if (preview) return preview;
  const parsed = restartLessonInput.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  try {
    const out = await restartLesson({ db, user, input: parsed.data });
    return { success: true, closed: out.closed, attemptNumber: out.attemptNumber };
  } catch (error) {
    logger.error("restart_lesson_failed", { userId: user.id, articleId: parsed.data.articleId, error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: "Failed" };
  }
}
