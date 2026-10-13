import { z } from "zod";

/** The two class modes: the workbook-first lock applies to `teacher_led` only. */
export const classBookModeSchema = z.enum(["teacher_led", "independent"]);
export type ClassBookMode = z.infer<typeof classBookModeSchema>;

/** Input of `assignClassBook`. */
export const assignClassBookInput = z.object({
  classroomId: z.string().uuid(),
  bookId: z.string().uuid(),
  mode: classBookModeSchema.default("teacher_led"),
  startDate: z.coerce.date().nullable().default(null),
});
export type AssignClassBookInput = z.input<typeof assignClassBookInput>;

/** A class book as the teacher screens show it. */
export const classBookSchema = z.object({
  id: z.string(),
  classroomId: z.string(),
  bookId: z.string(),
  bookKey: z.string(),
  bookName: z.string(),
  lessonCount: z.number().int(),
  mode: classBookModeSchema,
  startDate: z.date().nullable(),
  currentLesson: z.number().int().min(1),
  /** Lessons the teacher marked taught. */
  taughtCount: z.number().int().nonnegative(),
  /** Title of the current lesson; null when the catalogue lacks it. Set by `listClassBooks` only. */
  lessonTitle: z.string().nullable().optional(),
  /** Workbook steps done in the current lesson. Set by `listClassBooks` only. */
  stepsDoneCount: z.number().int().nonnegative().optional(),
  /** First workbook step (1-13) of the current lesson not done, or null when all are done. Set by `listClassBooks` only. */
  nextStep: z.number().int().nullable().optional(),
  /** Period (1-4) of the next step, or null. Set by `listClassBooks` only. */
  nextStepPeriod: z.number().int().nullable().optional(),
});
export type ClassBook = z.infer<typeof classBookSchema>;

/**
 * One row of the book slot on the teacher dashboard: a class book, or a class with no book
 * (`classBookId` is null and the book fields are null).
 */
export const teacherBookSlotSchema = z.object({
  classroomId: z.string(),
  classroomName: z.string(),
  classBookId: z.string().nullable(),
  bookName: z.string().nullable(),
  currentLesson: z.number().int().min(1).nullable(),
  lessonCount: z.number().int().nullable(),
  /** Title of the current lesson; null when the catalogue lacks it. */
  lessonTitle: z.string().nullable(),
  /** First workbook step (1-13) of the current lesson not done, or null. */
  nextStep: z.number().int().nullable(),
  /** Period (1-4) of the next step, or null. */
  nextStepPeriod: z.number().int().nullable(),
});
export type TeacherBookSlot = z.infer<typeof teacherBookSlotSchema>;

/** Input of `setCurrentLesson`. */
export const setCurrentLessonInput = z.object({ classBookId: z.string().uuid(), lessonNumber: z.number().int().min(1) });

/** Input of `markLessonTaught`. */
export const markLessonTaughtInput = z.object({
  classBookId: z.string().uuid(),
  lessonNumber: z.number().int().min(1),
  /** Workbook steps (1-13) done in class; default: all 13. */
  stepsDone: z.array(z.number().int().min(1).max(13)).default([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
});

/** Input of `markStepDone`: one workbook step of one lesson, done or undone. */
export const markStepDoneInput = z.object({
  classBookId: z.string().uuid(),
  lessonNumber: z.number().int().min(1),
  step: z.number().int().min(1).max(13),
  done: z.boolean().default(true),
});

/** One closed run of a lesson: what the class did before "Teach again". */
export const earlierRunSchema = z.object({
  runNumber: z.number().int().min(1),
  taughtAt: z.coerce.date().nullable(),
  stepsDone: z.array(z.number().int()),
  closedAt: z.coerce.date(),
  closedByUserId: z.string(),
});
export type EarlierRun = z.infer<typeof earlierRunSchema>;

/**
 * Parses the stored earlier runs of a lesson. A bad item is dropped.
 * @param value The jsonb value of `earlier_runs`.
 * @returns The earlier runs, oldest first.
 */
export function parseEarlierRuns(value: unknown): EarlierRun[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = earlierRunSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Input of `teachLessonAgain`. */
export const teachLessonAgainInput = z.object({ classBookId: z.string().uuid(), lessonNumber: z.number().int().min(1) });
export type TeachLessonAgainInput = z.input<typeof teachLessonAgainInput>;

/**
 * Output of `teachLessonAgain`: the new run number, the count of closed student attempts, the count of
 * roster students skipped (another school or no school), and whether the audit write failed.
 */
export const teachLessonAgainOutput = z.object({
  runNumber: z.number().int().min(1),
  closedAttempts: z.number().int().nonnegative(),
  skippedStudents: z.number().int().nonnegative(),
  auditFailed: z.boolean(),
});
export type TeachLessonAgainOutput = z.infer<typeof teachLessonAgainOutput>;

/** One lesson row of the pacing view. */
export const pacingLessonSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  key: z.string(),
  articleId: z.string().nullable(),
  approved: z.boolean(),
  taughtAt: z.date().nullable(),
  stepsDone: z.array(z.number().int()),
  /** 1 for the first time the class is taught the lesson; "Teach again" adds 1. */
  runNumber: z.number().int().min(1),
  /** The closed runs, oldest first. */
  earlierRuns: z.array(earlierRunSchema),
  /** True for the lesson the pointer is on. */
  current: z.boolean(),
});

/** The pacing view of a class book (FR-3). */
export const classBookPacingSchema = z.object({
  classBook: classBookSchema,
  lessons: z.array(pacingLessonSchema),
  /** The first workbook step of the current lesson that is not done, or null when all 13 are done. */
  nextStep: z.number().int().nullable(),
  /** The period (1-4) of the next step, or null. */
  plannedPeriod: z.number().int().nullable(),
});
export type ClassBookPacing = z.infer<typeof classBookPacingSchema>;

/** A class book as a student sees it (FR-4): the current lesson and what the lock allows. */
export const studentClassBookSchema = z.object({
  classBookId: z.string(),
  classroomId: z.string(),
  bookKey: z.string(),
  bookName: z.string(),
  mode: classBookModeSchema,
  currentLesson: z.number().int(),
  lessonCount: z.number().int(),
  /** The current lesson, when the catalogue has it with an approved article. */
  lesson: z
    .object({
      number: z.number().int(),
      title: z.string(),
      key: z.string(),
      articleId: z.string().nullable(),
      /** App steps (1-14) the student may open now. In independent mode: all 14. */
      unlockedAppSteps: z.array(z.number().int()),
    })
    .nullable(),
});
export type StudentClassBook = z.infer<typeof studentClassBookSchema>;

/** A book of the catalogue as the assign form lists it. */
export const catalogueBookSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  seriesName: z.string(),
  lessonCount: z.number().int(),
});
export type CatalogueBook = z.infer<typeof catalogueBookSchema>;

/** One lesson of a class book as a student sees it in the book view. */
export const studentBookLessonSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  /** The article to read, when the lesson is published. */
  articleId: z.string().nullable(),
  current: z.boolean(),
  taught: z.boolean(),
});

/** The book view of a student (FR-4): the class book with every lesson. */
export const studentBookSchema = studentClassBookSchema.extend({ lessons: z.array(studentBookLessonSchema) });
export type StudentBook = z.infer<typeof studentBookSchema>;

/** The preview book of a staff member: the shape of the student book, every lesson open, no progress. */
export const previewBookSchema = studentBookSchema;
export type PreviewBook = z.infer<typeof previewBookSchema>;

/** One class book that a staff member manages, for the preview home notices. */
export const managedClassBookSchema = z.object({
  classBookId: z.string(),
  classroomId: z.string(),
  classroomName: z.string(),
  bookName: z.string(),
  currentLesson: z.number().int(),
  lessonCount: z.number().int(),
});
export type ManagedClassBookItem = z.infer<typeof managedClassBookSchema>;
