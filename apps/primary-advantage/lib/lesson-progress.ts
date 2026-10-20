/** The number of tasks in a lesson. */
export const TOTAL_LESSON_TASKS = 14;

/**
 * Converts a task number to the stored progress percent.
 * @param task The lesson task number (1 to 14).
 * @returns 0 for task 1, else the rounded percent of 14 tasks.
 */
export function getLessonProgressForTask(task: number): number {
  const normalizedTask = Math.min(
    TOTAL_LESSON_TASKS,
    Math.max(1, Math.round(task)),
  );
  if (normalizedTask === 1) return 0;
  return Math.round((normalizedTask / TOTAL_LESSON_TASKS) * 100);
}

/**
 * Converts a stored progress percent to the task that opens on resume.
 * A progress above 0 never opens task 1, because the old start flow saved 7 for task 2.
 * @param progress The stored progress percent.
 * @returns The lesson task number (1 to 14).
 */
export function getLessonTaskFromProgress(progress: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return 1;
  return Math.min(
    TOTAL_LESSON_TASKS,
    Math.max(
      2,
      Math.round((Math.min(progress, 100) / 100) * TOTAL_LESSON_TASKS),
    ),
  );
}
