import { and, eq } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { classroomStudents, primaryBookLessons, primaryClassBookLessons, primaryClassBooks, users } from "@reading-advantage/db/schema";
import { assertCan, recordAuditEvent } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { closeAttemptInTx } from "../primary-lesson-attempts/attempts.js";
import { parseEarlierRuns, teachLessonAgainInput, type EarlierRun, type TeachLessonAgainInput, type TeachLessonAgainOutput } from "./class-book-contracts.js";
import { managedClassBook, type Ctx } from "./class-books.js";

const UNSCOPED_REASON = "teach again moves the lesson state and the attempts of the class students; the class book is authorized with managedClassBook first";

/**
 * Teaches a lesson again for the class (FR-3 "Teach again"). The current run goes into
 * `earlier_runs`, the taught time and the steps done are cleared, the lesson becomes current, and
 * each student of the class with work on the lesson gets a closed attempt with the reason
 * `teacher_teach_again`. A roster student of another school, or with no school, is skipped and
 * counted. XP stays. One audit event holds counts only; an audit failure shows in `auditFailed`.
 * @param params The database, the teacher, the class book, and the lesson number.
 * @returns The new run number, the closed and the skipped student counts, and the audit failure flag.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 * @throws When the lesson number is past the book or the book has no such lesson.
 */
export async function teachLessonAgain(params: Ctx & { input: TeachLessonAgainInput }): Promise<TeachLessonAgainOutput> {
  assertCan(params.user, "class:update", { schoolId: params.user.schoolId });
  const input = teachLessonAgainInput.parse(params.input);
  const book = await managedClassBook(params, input.classBookId);
  if (input.lessonNumber > book.lessonCount) throw new Error(`Lesson ${input.lessonNumber} is past the ${book.lessonCount} lessons of the book`);
  const now = params.now ?? new Date();
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  const [lesson] = await raw
    .select({ articleId: primaryBookLessons.articleId })
    .from(primaryBookLessons)
    .where(and(eq(primaryBookLessons.bookId, book.bookId), eq(primaryBookLessons.number, input.lessonNumber)))
    .limit(1);
  if (!lesson) throw new Error(`The book has no lesson ${input.lessonNumber}`);
  const roster = await raw
    .select({ studentId: classroomStudents.studentId, schoolId: users.schoolId })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .where(eq(classroomStudents.classroomId, book.classroomId));
  const students = roster.filter((row) => row.schoolId === book.schoolId);
  const skippedStudents = roster.length - students.length;

  const result = await raw.transaction(async (tx) => {
    const [state] = await tx
      .select({ taughtAt: primaryClassBookLessons.taughtAt, stepsDone: primaryClassBookLessons.stepsDone, runNumber: primaryClassBookLessons.runNumber, earlierRuns: primaryClassBookLessons.earlierRuns })
      .from(primaryClassBookLessons)
      .where(and(eq(primaryClassBookLessons.classBookId, input.classBookId), eq(primaryClassBookLessons.lessonNumber, input.lessonNumber)))
      .limit(1);
    const stepsDone = (state?.stepsDone as number[] | undefined) ?? [];
    const earlier = parseEarlierRuns(state?.earlierRuns);
    const hasRun = !!state?.taughtAt || stepsDone.length > 0;
    const current = state?.runNumber ?? 1;
    const runNumber = hasRun ? current + 1 : current;
    const earlierRuns = hasRun ? [...earlier, { runNumber: current, taughtAt: state?.taughtAt ?? null, stepsDone, closedAt: now, closedByUserId: params.user.id }] : earlier;
    const values = { taughtAt: null, stepsDone: [], runNumber, earlierRuns: JSON.parse(JSON.stringify(earlierRuns)), updatedAt: now };
    await tx
      .insert(primaryClassBookLessons)
      .values({ classBookId: input.classBookId, lessonNumber: input.lessonNumber, ...values })
      .onConflictDoUpdate({ target: [primaryClassBookLessons.classBookId, primaryClassBookLessons.lessonNumber], set: values });
    await tx.update(primaryClassBooks).set({ currentLesson: input.lessonNumber, updatedAt: now }).where(eq(primaryClassBooks.id, input.classBookId));
    let closedAttempts = 0;
    if (lesson.articleId) {
      for (const { studentId } of students) {
        const closed = await closeAttemptInTx(tx as unknown as DB, {
          schoolId: book.schoolId,
          closedByUserId: params.user.id,
          now,
          input: { studentId, articleId: lesson.articleId, classBookId: input.classBookId, lessonNumber: input.lessonNumber, reason: "teacher_teach_again" },
        });
        if (closed.closed) closedAttempts += 1;
      }
    }
    return { runNumber, closedAttempts };
  });

  let auditFailed = false;
  try {
    await recordAuditEvent(
      { actorUserId: params.user.id, actorRole: params.user.role, ipAddress: null, userAgent: null },
      { action: "class_book:teach_again", targetType: "class_book", targetId: input.classBookId, metadata: { lessonNumber: input.lessonNumber, runNumber: result.runNumber, studentCount: roster.length, closedAttempts: result.closedAttempts, skippedStudents } },
    );
  } catch {
    auditFailed = true;
  }
  return { ...result, skippedStudents, auditFailed };
}
