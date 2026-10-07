import { db } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { getClassBookProgress, recordLessonProgress, toProgressCsv } from "@reading-advantage/domain/primary-books";
import { logger } from "@/lib/observability/logger";

/** The number of app steps in a lesson. */
const APP_STEPS = 14;

/**
 * Records the class-book step a student moved to (FR-5) from a 14-step lesson percent.
 * A failure is logged and swallowed so it never blocks the lesson write.
 * @param user The signed-in student.
 * @param articleId The article of the lesson.
 * @param progress The lesson percent, 0 to 100.
 * @param timeSpent The seconds the student spent.
 * @param label The caller name for the error log.
 */
export async function recordLessonStep(
  user: UserContext,
  articleId: string,
  progress: number,
  timeSpent: number,
  label: string,
): Promise<void> {
  const reachedStep = Math.min(APP_STEPS, Math.max(1, Math.round((progress * APP_STEPS) / 100)));
  await recordLessonProgress({ db, user, input: { articleId, reachedStep, seconds: Math.round(Number(timeSpent) || 0) } }).catch(
    (error: unknown) => logger.error("class_book_progress_failed", { label, error }),
  );
}

/**
 * Builds the class grid of a class book as CSV (FR-6) for a teacher of the class.
 * @param user The signed-in teacher.
 * @param classBookId The class book.
 * @returns The CSV text and the book key for the file name.
 * @throws AuthError with code FORBIDDEN when the user may not manage the class.
 */
export async function exportClassBookProgress(user: UserContext, classBookId: string): Promise<{ csv: string; bookKey: string }> {
  const progress = await getClassBookProgress({ db, user, classBookId });
  return { csv: toProgressCsv(progress), bookKey: progress.classBook.bookKey };
}
