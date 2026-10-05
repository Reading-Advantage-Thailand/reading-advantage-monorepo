import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  classroomStudents,
  classroomTeachers,
  classrooms,
  primaryBookLessons,
  primaryBooks,
  primaryClassBookLessons,
  primaryClassBooks,
} from "@reading-advantage/db/schema";
import { assertCan, AuthError, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import {
  assignClassBookInput,
  markLessonTaughtInput,
  markStepDoneInput,
  setCurrentLessonInput,
  type AssignClassBookInput,
  type ClassBook,
  type ClassBookPacing,
  type StudentClassBook,
} from "./class-book-contracts.js";
import { APP_STEP_COUNT, WORKBOOK_STEPS, isAppStepUnlocked } from "./step-map.js";

/** The common parameters of every use-case. */
interface Ctx {
  db: DB;
  user: UserContext;
  now?: Date;
}

const UNSCOPED_REASON = "class books are read for classes of the user's school; the state and lesson tables have no school_id and hang off primary_class_books";

/**
 * Finds a class the user teaches (owner or co-teacher) in the user's school. A school admin or
 * SYSTEM user may manage any class of the school.
 * @param ctx The database and the user.
 * @param classroomId The class.
 * @returns The class id and school id.
 * @throws {AuthError} FORBIDDEN when the class is not in the user's school or the teacher does not teach it.
 */
async function managedClass(ctx: Ctx, classroomId: string): Promise<{ id: string; schoolId: string }> {
  const raw = createTenantDB(ctx.db, { schoolId: ctx.user.schoolId }).unscoped(UNSCOPED_REASON);
  const rows = await raw
    .select({ id: classrooms.id, schoolId: classrooms.schoolId, teacherId: classrooms.teacherId })
    .from(classrooms)
    .where(and(eq(classrooms.id, classroomId), eq(classrooms.archived, false)))
    .limit(1);
  const cls = rows[0];
  if (!cls || !cls.schoolId || (ctx.user.role !== "SYSTEM" && cls.schoolId !== ctx.user.schoolId)) throw new AuthError("The class is not in your school", "FORBIDDEN");
  if (ctx.user.role === "TEACHER" && cls.teacherId !== ctx.user.id) {
    const co = await raw
      .select({ classroomId: classroomTeachers.classroomId })
      .from(classroomTeachers)
      .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, ctx.user.id)))
      .limit(1);
    if (!co.length) throw new AuthError("You do not teach this class", "FORBIDDEN");
  }
  return { id: cls.id, schoolId: cls.schoolId };
}

/** The joined row of a class book with its book. */
const classBookSelect = {
  id: primaryClassBooks.id,
  classroomId: primaryClassBooks.classroomId,
  schoolId: primaryClassBooks.schoolId,
  bookId: primaryClassBooks.bookId,
  bookKey: primaryBooks.key,
  bookName: primaryBooks.name,
  lessonCount: primaryBooks.lessonCount,
  mode: primaryClassBooks.mode,
  startDate: primaryClassBooks.startDate,
  currentLesson: primaryClassBooks.currentLesson,
};

type ClassBookRow = { id: string; classroomId: string; schoolId: string; bookId: string; bookKey: string; bookName: string; lessonCount: number; mode: string; startDate: Date | null; currentLesson: number };

/**
 * Reads one class book the user may manage.
 * @param ctx The database and the user.
 * @param classBookId The class book.
 * @returns The row.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 */
async function managedClassBook(ctx: Ctx, classBookId: string): Promise<ClassBookRow> {
  const raw = createTenantDB(ctx.db, { schoolId: ctx.user.schoolId }).unscoped(UNSCOPED_REASON);
  const rows = await raw.select(classBookSelect).from(primaryClassBooks).innerJoin(primaryBooks, eq(primaryBooks.id, primaryClassBooks.bookId)).where(eq(primaryClassBooks.id, classBookId)).limit(1);
  const row = rows[0] as ClassBookRow | undefined;
  if (!row) throw new AuthError("Unknown class book", "FORBIDDEN");
  await managedClass(ctx, row.classroomId);
  return row;
}

/**
 * Counts the taught lessons of class books.
 * @param ctx The database and the user.
 * @param classBookIds The class books.
 * @returns Taught lesson count by class book id.
 */
async function taughtCounts(ctx: Ctx, classBookIds: string[]): Promise<Map<string, number>> {
  if (!classBookIds.length) return new Map();
  const raw = createTenantDB(ctx.db, { schoolId: ctx.user.schoolId }).unscoped(UNSCOPED_REASON);
  const rows = await raw
    .select({ classBookId: primaryClassBookLessons.classBookId, taughtAt: primaryClassBookLessons.taughtAt })
    .from(primaryClassBookLessons)
    .where(inArray(primaryClassBookLessons.classBookId, classBookIds));
  const counts = new Map<string, number>();
  for (const row of rows) if (row.taughtAt) counts.set(row.classBookId, (counts.get(row.classBookId) ?? 0) + 1);
  return counts;
}

const toClassBook = (row: ClassBookRow, taughtCount: number): ClassBook => ({
  id: row.id,
  classroomId: row.classroomId,
  bookId: row.bookId,
  bookKey: row.bookKey,
  bookName: row.bookName,
  lessonCount: row.lessonCount,
  mode: row.mode === "independent" ? "independent" : "teacher_led",
  startDate: row.startDate,
  currentLesson: row.currentLesson,
  taughtCount,
});

/**
 * Assigns a book to a class (FR-1). A second call for the same class and book updates the mode
 * and the start date and keeps the pointer.
 * @param params The database, the teacher, and the class, book, mode, and start date.
 * @returns The class book.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 */
export async function assignClassBook(params: Ctx & { input: AssignClassBookInput }): Promise<ClassBook> {
  assertCan(params.user, "class:update", { schoolId: params.user.schoolId });
  const input = assignClassBookInput.parse(params.input);
  const cls = await managedClass(params, input.classroomId);
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  const values = { schoolId: cls.schoolId, classroomId: cls.id, bookId: input.bookId, mode: input.mode, startDate: input.startDate, assignedBy: params.user.id };
  const [row] = await raw
    .insert(primaryClassBooks)
    .values(values)
    .onConflictDoUpdate({ target: [primaryClassBooks.classroomId, primaryClassBooks.bookId], set: { mode: input.mode, startDate: input.startDate, updatedAt: new Date() } })
    .returning({ id: primaryClassBooks.id });
  return (await listClassBooks({ ...params, classroomId: cls.id })).find((book) => book.id === row.id)!;
}

/**
 * Lists the books of a class with the pointer and the taught count (teacher view).
 * @param params The database, the user, and the class.
 * @returns The class books, oldest first.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 */
export async function listClassBooks(params: Ctx & { classroomId: string }): Promise<ClassBook[]> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  await managedClass(params, params.classroomId);
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  const rows = (await raw
    .select(classBookSelect)
    .from(primaryClassBooks)
    .innerJoin(primaryBooks, eq(primaryBooks.id, primaryClassBooks.bookId))
    .where(eq(primaryClassBooks.classroomId, params.classroomId))
    .orderBy(asc(primaryClassBooks.createdAt))) as ClassBookRow[];
  const taught = await taughtCounts(params, rows.map((row) => row.id));
  return rows.map((row) => toClassBook(row, taught.get(row.id) ?? 0));
}

/**
 * Moves the lesson pointer of a class book (FR-3).
 * @param params The database, the teacher, the class book, and the lesson number.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 * @throws When the lesson number is past the book.
 */
export async function setCurrentLesson(params: Ctx & { input: { classBookId: string; lessonNumber: number } }): Promise<void> {
  assertCan(params.user, "class:update", { schoolId: params.user.schoolId });
  const input = setCurrentLessonInput.parse(params.input);
  const book = await managedClassBook(params, input.classBookId);
  if (input.lessonNumber > book.lessonCount) throw new Error(`Lesson ${input.lessonNumber} is past the ${book.lessonCount} lessons of the book`);
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  await raw.update(primaryClassBooks).set({ currentLesson: input.lessonNumber, updatedAt: new Date() }).where(eq(primaryClassBooks.id, input.classBookId));
}

/**
 * Marks a lesson taught (FR-3): stores the time and the steps done, and moves the pointer to the
 * next lesson when the taught lesson is the current one.
 * @param params The database, the teacher, the class book, the lesson, and the steps done.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 */
export async function markLessonTaught(params: Ctx & { input: { classBookId: string; lessonNumber: number; stepsDone?: number[] } }): Promise<void> {
  assertCan(params.user, "class:update", { schoolId: params.user.schoolId });
  const input = markLessonTaughtInput.parse(params.input);
  const book = await managedClassBook(params, input.classBookId);
  const now = params.now ?? new Date();
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  await raw.transaction(async (tx) => {
    await tx
      .insert(primaryClassBookLessons)
      .values({ classBookId: input.classBookId, lessonNumber: input.lessonNumber, taughtAt: now, stepsDone: input.stepsDone, updatedAt: now })
      .onConflictDoUpdate({ target: [primaryClassBookLessons.classBookId, primaryClassBookLessons.lessonNumber], set: { taughtAt: now, stepsDone: input.stepsDone, updatedAt: now } });
    if (book.currentLesson === input.lessonNumber && input.lessonNumber < book.lessonCount) {
      await tx.update(primaryClassBooks).set({ currentLesson: input.lessonNumber + 1, updatedAt: now }).where(eq(primaryClassBooks.id, input.classBookId));
    }
  });
}

/**
 * Marks one workbook step of a lesson done or undone for the class (the workbook-first lock).
 * @param params The database, the teacher, the class book, the lesson, the step, and done.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 */
export async function markStepDone(params: Ctx & { input: { classBookId: string; lessonNumber: number; step: number; done?: boolean } }): Promise<number[]> {
  assertCan(params.user, "class:update", { schoolId: params.user.schoolId });
  const input = markStepDoneInput.parse(params.input);
  await managedClassBook(params, input.classBookId);
  const now = params.now ?? new Date();
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  const existing = await raw
    .select({ stepsDone: primaryClassBookLessons.stepsDone })
    .from(primaryClassBookLessons)
    .where(and(eq(primaryClassBookLessons.classBookId, input.classBookId), eq(primaryClassBookLessons.lessonNumber, input.lessonNumber)))
    .limit(1);
  const current = new Set((existing[0]?.stepsDone as number[] | undefined) ?? []);
  if (input.done) current.add(input.step);
  else current.delete(input.step);
  const stepsDone = [...current].sort((a, b) => a - b);
  await raw
    .insert(primaryClassBookLessons)
    .values({ classBookId: input.classBookId, lessonNumber: input.lessonNumber, stepsDone, updatedAt: now })
    .onConflictDoUpdate({ target: [primaryClassBookLessons.classBookId, primaryClassBookLessons.lessonNumber], set: { stepsDone, updatedAt: now } });
  return stepsDone;
}

/**
 * The pacing view of a class book (FR-3): every lesson with its taught time and steps done, the
 * next workbook step of the current lesson, and its planned period.
 * @param params The database, the user, and the class book.
 * @returns The pacing view.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 */
export async function getClassBookPacing(params: Ctx & { classBookId: string }): Promise<ClassBookPacing> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  const book = await managedClassBook(params, params.classBookId);
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  const [lessons, states] = await Promise.all([
    raw
      .select({ number: primaryBookLessons.number, title: primaryBookLessons.title, key: primaryBookLessons.key, articleId: primaryBookLessons.articleId, approved: primaryBookLessons.approved })
      .from(primaryBookLessons)
      .where(eq(primaryBookLessons.bookId, book.bookId))
      .orderBy(asc(primaryBookLessons.number)),
    raw
      .select({ lessonNumber: primaryClassBookLessons.lessonNumber, taughtAt: primaryClassBookLessons.taughtAt, stepsDone: primaryClassBookLessons.stepsDone })
      .from(primaryClassBookLessons)
      .where(eq(primaryClassBookLessons.classBookId, params.classBookId)),
  ]);
  const stateBy = new Map(states.map((state) => [state.lessonNumber, state]));
  const rows = lessons.map((lesson) => {
    const state = stateBy.get(lesson.number);
    return {
      number: lesson.number,
      title: lesson.title,
      key: lesson.key,
      articleId: lesson.articleId,
      approved: lesson.approved,
      taughtAt: state?.taughtAt ?? null,
      stepsDone: ((state?.stepsDone as number[] | undefined) ?? []).slice().sort((a, b) => a - b),
      current: lesson.number === book.currentLesson,
    };
  });
  const currentState = stateBy.get(book.currentLesson);
  const done = new Set((currentState?.stepsDone as number[] | undefined) ?? []);
  const next = WORKBOOK_STEPS.find((step) => !done.has(step.step));
  const taught = states.filter((state) => state.taughtAt).length;
  return { classBook: toClassBook(book, taught), lessons: rows, nextStep: next?.step ?? null, plannedPeriod: next?.period ?? null };
}

/**
 * The class books of the signed-in student's classes (FR-4): the current lesson of each, with
 * the app steps the workbook-first lock allows today. Independent mode unlocks every step.
 * @param params The database and the student.
 * @returns One entry per class book, class by class.
 */
export async function getStudentClassBooks(params: Ctx): Promise<StudentClassBook[]> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  if (!params.user.schoolId) return [];
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  const memberships = await raw.select({ classroomId: classroomStudents.classroomId }).from(classroomStudents).where(eq(classroomStudents.studentId, params.user.id));
  const classIds = memberships.map((row) => row.classroomId);
  if (!classIds.length) return [];
  const books = (await raw
    .select(classBookSelect)
    .from(primaryClassBooks)
    .innerJoin(primaryBooks, eq(primaryBooks.id, primaryClassBooks.bookId))
    .where(and(inArray(primaryClassBooks.classroomId, classIds), eq(primaryClassBooks.schoolId, params.user.schoolId)))
    .orderBy(asc(primaryClassBooks.createdAt))) as ClassBookRow[];
  if (!books.length) return [];
  const [lessons, states] = await Promise.all([
    raw
      .select({ bookId: primaryBookLessons.bookId, number: primaryBookLessons.number, title: primaryBookLessons.title, key: primaryBookLessons.key, articleId: primaryBookLessons.articleId, approved: primaryBookLessons.approved })
      .from(primaryBookLessons)
      .where(
        or(...books.map((book) => and(eq(primaryBookLessons.bookId, book.bookId), eq(primaryBookLessons.number, book.currentLesson)))),
      ),
    raw
      .select({ classBookId: primaryClassBookLessons.classBookId, lessonNumber: primaryClassBookLessons.lessonNumber, stepsDone: primaryClassBookLessons.stepsDone })
      .from(primaryClassBookLessons)
      .where(inArray(primaryClassBookLessons.classBookId, books.map((book) => book.id))),
  ]);
  const allSteps = Array.from({ length: APP_STEP_COUNT }, (_, index) => index + 1);
  return books.map((book) => {
    const lesson = lessons.find((row) => row.bookId === book.bookId && row.number === book.currentLesson);
    const state = states.find((row) => row.classBookId === book.id && row.lessonNumber === book.currentLesson);
    const stepsDone = (state?.stepsDone as number[] | undefined) ?? [];
    const unlocked = book.mode === "independent" ? allSteps : allSteps.filter((step) => isAppStepUnlocked(step, stepsDone));
    return {
      classBookId: book.id,
      classroomId: book.classroomId,
      bookKey: book.bookKey,
      bookName: book.bookName,
      mode: book.mode === "independent" ? "independent" : "teacher_led",
      currentLesson: book.currentLesson,
      lessonCount: book.lessonCount,
      lesson: lesson
        ? { number: lesson.number, title: lesson.title, key: lesson.key, articleId: lesson.approved ? lesson.articleId : null, unlockedAppSteps: unlocked }
        : null,
    };
  });
}
