import { and, asc, eq, inArray, max } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  articleActivityLogs,
  lessonProgress,
  primaryBookLessons,
  primaryClassBooks,
  primaryLessonAttempts,
  primaryStudentLessonSteps,
  studentAssignments,
  userActivity,
  users,
  xpLogs,
} from "@reading-advantage/db/schema";
import { assertCan, AuthError, type UserContext } from "@reading-advantage/auth";
import { assertStudentRecordWriter } from "../primary-avatar/permissions.js";
import { createTenantDB } from "../db-contract.js";
import {
  closeLessonAttemptInput,
  LESSON_ACTIVITY_TYPES,
  type CloseLessonAttemptInput,
  type CloseLessonAttemptOutput,
  type LessonAttempt,
  lessonAttemptSchema,
  restartLessonInput,
  type RestartLessonInput,
  type RestartLessonOutput,
} from "./contracts.js";

const UNSCOPED_REASON = "lesson attempts move rows of user_activity, lesson_progress, and student steps (REFERENTIAL); the student school is checked first";

/** Parameters of the transaction-level close. The caller has already authorized the user. */
export interface CloseAttemptParams {
  /** The school of the acting user. The student must belong to it. */
  schoolId: string;
  /** The user who closes the attempt. */
  closedByUserId: string;
  now?: Date;
  input: CloseLessonAttemptInput;
}

/**
 * Closes the current attempt of one student on one article inside an open transaction. It copies
 * the lesson rows into the history, deletes them, clears the flags, and resets the progress. XP
 * logs and `users.xp` stay. The caller must authorize the user and run this inside a transaction.
 * @param tx The open transaction.
 * @param params The school, the acting user, and the input.
 * @returns Whether an attempt closed, and its number.
 * @throws {AuthError} FORBIDDEN when the student does not belong to the school.
 */
export async function closeAttemptInTx(tx: DB, params: CloseAttemptParams): Promise<CloseLessonAttemptOutput> {
  const input = closeLessonAttemptInput.parse(params.input);
  const now = params.now ?? new Date();
  const [owner] = await tx.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, input.studentId)).limit(1);
  if (!owner || owner.schoolId !== params.schoolId) throw new AuthError("The student is not in your school", "FORBIDDEN");

  const activities = await tx
    .select()
    .from(userActivity)
    .where(and(eq(userActivity.userId, input.studentId), eq(userActivity.targetId, input.articleId), inArray(userActivity.activityType, [...LESSON_ACTIVITY_TYPES])));
  const activityIds = activities.map((row) => row.id);
  const xpRows = activityIds.length ? await tx.select({ xpEarned: xpLogs.xpEarned }).from(xpLogs).where(and(eq(xpLogs.userId, input.studentId), inArray(xpLogs.activityId, activityIds))) : [];
  const lessonIds = [input.articleId, ...(input.assignmentId ? [input.assignmentId] : [])];
  const progressRows = await tx
    .select({ id: lessonProgress.id, progress: lessonProgress.progress, timeSpent: lessonProgress.timeSpent, isCompleted: lessonProgress.isCompleted, completedAt: lessonProgress.completedAt, createdAt: lessonProgress.createdAt })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, input.studentId), inArray(lessonProgress.lessonId, lessonIds)));
  const stepFilter = [
    eq(primaryStudentLessonSteps.studentId, input.studentId),
    eq(primaryBookLessons.articleId, input.articleId),
    ...(input.classBookId ? [eq(primaryStudentLessonSteps.classBookId, input.classBookId)] : []),
    ...(input.lessonNumber ? [eq(primaryStudentLessonSteps.lessonNumber, input.lessonNumber)] : []),
  ];
  const steps = await tx
    .select({
      id: primaryStudentLessonSteps.id,
      classBookId: primaryStudentLessonSteps.classBookId,
      lessonNumber: primaryStudentLessonSteps.lessonNumber,
      appStep: primaryStudentLessonSteps.appStep,
      status: primaryStudentLessonSteps.status,
      startedAt: primaryStudentLessonSteps.startedAt,
      doneAt: primaryStudentLessonSteps.doneAt,
      seconds: primaryStudentLessonSteps.seconds,
    })
    .from(primaryStudentLessonSteps)
    .innerJoin(primaryClassBooks, eq(primaryClassBooks.id, primaryStudentLessonSteps.classBookId))
    .innerJoin(primaryBookLessons, and(eq(primaryBookLessons.bookId, primaryClassBooks.bookId), eq(primaryBookLessons.number, primaryStudentLessonSteps.lessonNumber)))
    .where(and(...stepFilter));

  const progressRow = progressRows[0];
  const hasWork = activities.length > 0 || steps.length > 0 || (progressRows.some((row) => row.progress > 0 || row.timeSpent > 0 || row.isCompleted));
  if (!hasWork) return { closed: false, attemptNumber: null };

  const [latest] = await tx
    .select({ max: max(primaryLessonAttempts.attemptNumber) })
    .from(primaryLessonAttempts)
    .where(and(eq(primaryLessonAttempts.studentId, input.studentId), eq(primaryLessonAttempts.articleId, input.articleId)));
  const attemptNumber = (latest?.max ?? 0) + 1;
  const assignmentRow = input.assignmentId
    ? (await tx.select({ id: studentAssignments.id, completedAt: studentAssignments.completedAt, score: studentAssignments.score }).from(studentAssignments).where(and(eq(studentAssignments.assignmentId, input.assignmentId), eq(studentAssignments.studentId, input.studentId))).limit(1))[0]
    : undefined;
  const single = new Set(steps.map((row) => `${row.classBookId}:${row.lessonNumber}`)).size === 1 ? steps[0] : undefined;
  const times = [...steps.map((row) => row.startedAt), progressRow?.createdAt].filter((date): date is Date => !!date);

  await tx.insert(primaryLessonAttempts).values({
    schoolId: params.schoolId,
    studentId: input.studentId,
    articleId: input.articleId,
    assignmentId: input.assignmentId ?? null,
    classBookId: input.classBookId ?? single?.classBookId ?? null,
    lessonNumber: input.lessonNumber ?? single?.lessonNumber ?? null,
    attemptNumber,
    startedAt: times.length ? new Date(Math.min(...times.map((date) => date.getTime()))) : null,
    closedAt: now,
    closedByUserId: params.closedByUserId,
    closeReason: input.reason,
    progress: Math.max(0, ...progressRows.map((row) => row.progress)),
    timeSpent: Math.max(0, ...progressRows.map((row) => row.timeSpent)),
    completed: progressRows.some((row) => row.isCompleted),
    completedAt: assignmentRow?.completedAt ?? progressRow?.completedAt ?? null,
    score: assignmentRow?.score ?? null,
    xpEarned: xpRows.reduce((sum, row) => sum + row.xpEarned, 0),
    activities,
    steps,
  });
  if (activityIds.length) await tx.delete(userActivity).where(inArray(userActivity.id, activityIds));
  if (steps.length) await tx.delete(primaryStudentLessonSteps).where(inArray(primaryStudentLessonSteps.id, steps.map((row) => row.id)));
  await tx
    .update(articleActivityLogs)
    .set({
      isMultipleChoiceQuestionCompleted: false,
      isShortAnswerQuestionCompleted: false,
      isLongAnswerQuestionCompleted: false,
      isSentenceMatchingCompleted: false,
      isSentenceOrderingCompleted: false,
      isSentenceWordOrderingCompleted: false,
      isSentenceClozeTestCompleted: false,
      updatedAt: now,
    })
    .where(and(eq(articleActivityLogs.userId, input.studentId), eq(articleActivityLogs.articleId, input.articleId)));
  await tx
    .update(lessonProgress)
    .set({ progress: 0, status: "not_started", isCompleted: false, completedAt: null, timeSpent: 0, updatedAt: now })
    .where(and(eq(lessonProgress.userId, input.studentId), inArray(lessonProgress.lessonId, lessonIds)));
  if (assignmentRow) {
    await tx
      .update(studentAssignments)
      .set({ status: "IN_PROGRESS", completed: false, completedAt: null, score: null, updatedAt: now })
      .where(eq(studentAssignments.id, assignmentRow.id));
  }
  return { closed: true, attemptNumber };
}

/**
 * Closes the current attempt of the signed-in student (the student "Start again" path).
 * @param params The database, the student, and the input. The student must close own work with reason `student_restart`.
 * @returns Whether an attempt closed, and its number.
 * @throws {AuthError} FORBIDDEN for a non-student, another student, another reason, or another school.
 */
export async function closeLessonAttempt(params: { db: DB; user: UserContext; now?: Date; input: CloseLessonAttemptInput }): Promise<CloseLessonAttemptOutput> {
  assertCan(params.user, "progress:record", { schoolId: params.user.schoolId });
  const input = closeLessonAttemptInput.parse(params.input);
  if (input.studentId !== params.user.id || input.reason !== "student_restart") throw new AuthError("A student closes only own attempts", "FORBIDDEN");
  if (!params.user.schoolId) throw new AuthError("The student has no school", "FORBIDDEN");
  const schoolId = params.user.schoolId;
  const raw = createTenantDB(params.db, { schoolId }).unscoped(UNSCOPED_REASON);
  return raw.transaction((tx) => closeAttemptInTx(tx as unknown as DB, { schoolId, closedByUserId: params.user.id, now: params.now, input }));
}

/**
 * Starts a lesson again for the signed-in student: closes the current attempt with the reason
 * `student_restart`. XP logs and `users.xp` stay (legacy rule). An assignment lesson goes back to in progress.
 * @param params The database, the student, and the input.
 * @returns Whether an attempt closed, and the number of the new current attempt.
 * @throws {AuthError} FORBIDDEN for a non-student user.
 */
export async function restartLesson(params: { db: DB; user: UserContext; now?: Date; input: RestartLessonInput }): Promise<RestartLessonOutput> {
  assertStudentRecordWriter(params.user);
  const input = restartLessonInput.parse(params.input);
  const out = await closeLessonAttempt({
    db: params.db,
    user: params.user,
    now: params.now,
    input: { studentId: params.user.id, articleId: input.articleId, assignmentId: input.assignmentId, reason: "student_restart" },
  });
  return { closed: out.closed, attemptNumber: out.attemptNumber === null ? null : out.attemptNumber + 1 };
}

/**
 * Lists the closed attempts of one student, oldest first. A student reads own attempts. Staff read
 * the attempts of students of the same school.
 * @param params The database, the user, the student, and the optional article and class book filters.
 * @returns The closed attempts.
 * @throws {AuthError} FORBIDDEN when a student reads another student, or the user has no school.
 */
export async function listLessonAttempts(params: { db: DB; user: UserContext; studentId: string; articleId?: string; classBookId?: string }): Promise<LessonAttempt[]> {
  const schoolId = params.user.schoolId;
  if (!schoolId) throw new AuthError("The user has no school", "FORBIDDEN");
  if (params.user.role === "STUDENT") {
    assertCan(params.user, "progress:read:own", { schoolId });
    if (params.studentId !== params.user.id) throw new AuthError("A student reads only own attempts", "FORBIDDEN");
  } else {
    assertCan(params.user, "progress:read:all", { schoolId });
  }
  const rows = await createTenantDB(params.db, { schoolId })
    .select({
      id: primaryLessonAttempts.id,
      studentId: primaryLessonAttempts.studentId,
      articleId: primaryLessonAttempts.articleId,
      assignmentId: primaryLessonAttempts.assignmentId,
      classBookId: primaryLessonAttempts.classBookId,
      lessonNumber: primaryLessonAttempts.lessonNumber,
      attemptNumber: primaryLessonAttempts.attemptNumber,
      startedAt: primaryLessonAttempts.startedAt,
      closedAt: primaryLessonAttempts.closedAt,
      closeReason: primaryLessonAttempts.closeReason,
      progress: primaryLessonAttempts.progress,
      timeSpent: primaryLessonAttempts.timeSpent,
      completed: primaryLessonAttempts.completed,
      completedAt: primaryLessonAttempts.completedAt,
      score: primaryLessonAttempts.score,
      xpEarned: primaryLessonAttempts.xpEarned,
    })
    .from(primaryLessonAttempts)
    .where(and(eq(primaryLessonAttempts.studentId, params.studentId), ...(params.articleId ? [eq(primaryLessonAttempts.articleId, params.articleId)] : []), ...(params.classBookId ? [eq(primaryLessonAttempts.classBookId, params.classBookId)] : [])))
    .orderBy(asc(primaryLessonAttempts.closedAt), asc(primaryLessonAttempts.attemptNumber));
  return rows.map((row) => lessonAttemptSchema.parse(row));
}
