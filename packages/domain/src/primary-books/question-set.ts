/**
 * The questions a student answers per article (owner decision 2026-10-06): the first five
 * multiple-choice questions and the first short-answer question of the bank, in bank order.
 * The teacher answer key shows the same set, so the key and the student screen match.
 */
export const STUDENT_MCQ_COUNT = 5;
export const STUDENT_SAQ_COUNT = 1;

/**
 * Picks the student set of a question list: sorted by `order` (rows without one keep their
 * place after the ordered rows), then the first `count`.
 * @param rows The stored or packaged questions.
 * @param count How many the student answers.
 * @returns The questions in order.
 */
export function studentQuestionSet<T extends { order?: number | null }>(rows: readonly T[], count: number): T[] {
  const rank = (row: T) => (typeof row.order === "number" ? row.order : Number.MAX_SAFE_INTEGER);
  return [...rows].sort((a, b) => rank(a) - rank(b)).slice(0, count);
}
