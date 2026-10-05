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
});
export type ClassBook = z.infer<typeof classBookSchema>;

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

/** One lesson row of the pacing view. */
export const pacingLessonSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  key: z.string(),
  articleId: z.string().nullable(),
  approved: z.boolean(),
  taughtAt: z.date().nullable(),
  stepsDone: z.array(z.number().int()),
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
