import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { articles, classroomTeachers, classrooms, primaryBookLessons, primaryBooks, primaryClassBookLessons, primaryClassBooks, primaryLessonGuides } from "@reading-advantage/db/schema";
import { assertCan } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { managedClassBook, toClassBook, type Ctx } from "./class-books.js";
import { lessonActivitiesSchema, lessonBankSchema, glossaryWordSchema, type BookLessonRef, type LessonGuidePeriod, type LessonGuideStep, type TeacherLesson } from "./lesson-support-contracts.js";
import { STUDENT_MCQ_COUNT, STUDENT_SAQ_COUNT, studentQuestionSet } from "./question-set.js";
import { PERIODS } from "./step-map.js";
import { z } from "zod";

const CATALOGUE_REASON = "the book catalogue, the guides, and the articles are global (EXEMPT or owner-scoped); no tenant";


/** The key shows the questions the students answer: the first five MCQs and the first SAQ. */
const studentBank = <B extends { mcq: readonly unknown[]; saq: readonly unknown[] }>(bank: B): B => ({
  ...bank,
  mcq: studentQuestionSet(bank.mcq as { order?: number | null }[], STUDENT_MCQ_COUNT),
  saq: studentQuestionSet(bank.saq as { order?: number | null }[], STUDENT_SAQ_COUNT),
});

/**
 * The language of the teacher guide for a UI locale (FR-8): Thai for Thai, English otherwise.
 * @param locale The UI locale.
 * @returns `th` or `en`.
 */
export const guideLocaleOf = (locale: string): "en" | "th" => (locale === "th" ? "th" : "en");

/**
 * The teacher guide (FR-8): the 13 workbook steps grouped into the four periods, in the guide
 * language of the UI locale. A step without a Thai row falls back to English.
 * @param params The database and the UI locale.
 * @returns The periods with their steps; empty when the guides are not imported.
 */
export async function getLessonGuide(params: { db: DB; locale: string }): Promise<LessonGuidePeriod[]> {
  const wanted = guideLocaleOf(params.locale);
  const raw = createTenantDB(params.db, { schoolId: null }).unscoped(CATALOGUE_REASON);
  const rows = await raw
    .select({
      step: primaryLessonGuides.step,
      locale: primaryLessonGuides.locale,
      title: primaryLessonGuides.title,
      period: primaryLessonGuides.period,
      teacherActions: primaryLessonGuides.teacherActions,
      teacherLanguage: primaryLessonGuides.teacherLanguage,
      studentActions: primaryLessonGuides.studentActions,
      watchFor: primaryLessonGuides.watchFor,
      scriptMd: primaryLessonGuides.scriptMd,
    })
    .from(primaryLessonGuides)
    .where(inArray(primaryLessonGuides.locale, wanted === "en" ? ["en"] : ["en", "th"]))
    .orderBy(asc(primaryLessonGuides.step));
  const byStep = new Map<number, LessonGuideStep>();
  for (const row of rows) {
    const current = byStep.get(row.step);
    if (current && row.locale !== wanted) continue;
    byStep.set(row.step, {
      step: row.step,
      title: row.title,
      period: row.period,
      teacherActions: (row.teacherActions as string[]) ?? [],
      teacherLanguage: (row.teacherLanguage as string[]) ?? [],
      studentActions: (row.studentActions as string[]) ?? [],
      watchFor: (row.watchFor as string[]) ?? [],
      scriptMd: row.scriptMd ?? null,
    });
  }
  const steps = [...byStep.values()].sort((a, b) => a.step - b.step);
  return PERIODS.map(({ period }) => ({ period, steps: steps.filter((step) => step.period === period) })).filter((group) => group.steps.length);
}

/**
 * One lesson of a class book for the teacher pages (FR-11, FR-12): the catalogue row, the
 * article paragraphs when the lesson is linked, the glossary, the question bank with answers,
 * the print activities, and the steps the class has done.
 * @param params The database, the teacher, the class book, and the lesson number.
 * @returns The lesson.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 * @throws When the book has no such lesson in the catalogue.
 */
export async function getTeacherLesson(params: Ctx & { classBookId: string; number: number }): Promise<TeacherLesson> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  const book = await managedClassBook(params, params.classBookId);
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(CATALOGUE_REASON);
  const [lessons, states] = await Promise.all([
    raw
      .select({ number: primaryBookLessons.number, title: primaryBookLessons.title, key: primaryBookLessons.key, articleId: primaryBookLessons.articleId, approved: primaryBookLessons.approved, package: primaryBookLessons.package })
      .from(primaryBookLessons)
      .where(and(eq(primaryBookLessons.bookId, book.bookId), eq(primaryBookLessons.number, params.number)))
      .limit(1),
    raw
      .select({ lessonNumber: primaryClassBookLessons.lessonNumber, taughtAt: primaryClassBookLessons.taughtAt, stepsDone: primaryClassBookLessons.stepsDone })
      .from(primaryClassBookLessons)
      .where(eq(primaryClassBookLessons.classBookId, params.classBookId)),
  ]);
  const lesson = lessons[0];
  if (!lesson) throw new Error(`Lesson ${params.number} of ${book.bookKey} is not in the catalogue`);
  const articleRows = lesson.articleId
    ? await raw.select({ title: articles.title, passage: articles.passage }).from(articles).where(eq(articles.id, lesson.articleId)).limit(1)
    : [];
  const article = articleRows[0];
  const pkg = (lesson.package ?? {}) as Record<string, unknown>;
  const state = states.find((row) => row.lessonNumber === params.number);
  return {
    classBook: toClassBook(book, states.filter((row) => row.taughtAt).length),
    lesson: { number: lesson.number, title: lesson.title, key: lesson.key, articleId: lesson.articleId, approved: lesson.approved },
    article: article ? { title: article.title, paragraphs: (article.passage ?? "").split(/\n\s*\n/).filter(Boolean) } : null,
    glossary: z.array(glossaryWordSchema).catch([]).parse(pkg.glossary ?? []),
    bank: studentBank(lessonBankSchema.catch({ mcq: [], saq: [], laq: [] }).parse(pkg.bank ?? {})),
    activities: pkg.activities ? lessonActivitiesSchema.catch({}).parse(pkg.activities) : null,
    summary: typeof pkg.summary === "string" ? pkg.summary : null,
    thaiSummary: typeof pkg.thaiSummary === "string" ? pkg.thaiSummary : null,
    stepsDone: ((state?.stepsDone as number[] | undefined) ?? []).slice().sort((a, b) => a - b),
  };
}

/**
 * Resolves a printed QR link (FR-16) `/b/<book>/<n>` to the catalogue lesson.
 * @param params The database, the book key (`o3-2`), and the lesson number.
 * @returns The lesson, or null when the book or the lesson is not in the catalogue.
 */
export async function resolveBookLesson(params: { db: DB; bookKey: string; number: number }): Promise<BookLessonRef | null> {
  const raw = createTenantDB(params.db, { schoolId: null }).unscoped(CATALOGUE_REASON);
  const rows = await raw
    .select({ bookId: primaryBooks.id, bookKey: primaryBooks.key, bookName: primaryBooks.name, number: primaryBookLessons.number, title: primaryBookLessons.title, articleId: primaryBookLessons.articleId, approved: primaryBookLessons.approved })
    .from(primaryBookLessons)
    .innerJoin(primaryBooks, eq(primaryBooks.id, primaryBookLessons.bookId))
    .where(and(eq(primaryBooks.key, params.bookKey), eq(primaryBookLessons.number, params.number)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The first class book of a book in the classes the teacher teaches (FR-16: where a teacher's
 * QR scan lands).
 * @param params The database, the teacher, and the book.
 * @returns The class book id and its class, or null.
 */
export async function findTeacherClassBook(params: Ctx & { bookId: string }): Promise<{ classBookId: string; classroomId: string } | null> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  if (!params.user.schoolId) return null;
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped("class books of the classes the teacher owns or co-teaches, school-checked");
  const taught = await raw
    .select({ id: classrooms.id })
    .from(classrooms)
    .leftJoin(classroomTeachers, and(eq(classroomTeachers.classroomId, classrooms.id), eq(classroomTeachers.teacherId, params.user.id)))
    .where(and(eq(classrooms.schoolId, params.user.schoolId), eq(classrooms.archived, false), or(eq(classrooms.teacherId, params.user.id), eq(classroomTeachers.teacherId, params.user.id))));
  if (!taught.length) return null;
  const rows = await raw
    .select({ classBookId: primaryClassBooks.id, classroomId: primaryClassBooks.classroomId })
    .from(primaryClassBooks)
    .where(and(eq(primaryClassBooks.bookId, params.bookId), inArray(primaryClassBooks.classroomId, taught.map((row) => row.id))))
    .orderBy(asc(primaryClassBooks.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
