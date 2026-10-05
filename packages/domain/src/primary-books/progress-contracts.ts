import { z } from "zod";
import { classBookSchema } from "./class-book-contracts.js";

/** The status of one app step of one student. */
export const stepStatusSchema = z.enum(["not_started", "in_progress", "done"]);
export type StepStatus = z.infer<typeof stepStatusSchema>;

/** Days without activity after which an in-progress lesson counts as stuck (FR-6 filter). */
export const STUCK_DAYS = 7;

/** Input of `recordLessonProgress`: the student reached an app step of an article. */
export const recordLessonProgressInput = z.object({
  articleId: z.string().uuid(),
  /** The app step (1-14) the student moved to; every earlier step is done. */
  reachedStep: z.number().int().min(1).max(14),
  /** The lesson timer in seconds when the step was reached. */
  seconds: z.number().int().nonnegative().default(0),
});
export type RecordLessonProgressInput = z.input<typeof recordLessonProgressInput>;

/** One student of the class grid. */
export const progressStudentSchema = z.object({ id: z.string(), name: z.string().nullable(), username: z.string() });

/** One lesson column of the class grid. */
export const progressLessonSchema = z.object({ number: z.number().int(), title: z.string(), taughtAt: z.date().nullable() });

/** One cell of the class grid (FR-5, FR-6, FR-7): one student and one lesson. */
export const progressCellSchema = z.object({
  studentId: z.string(),
  lessonNumber: z.number().int(),
  status: stepStatusSchema,
  /** App steps done, out of 14. */
  doneSteps: z.number().int(),
  /** The step the student is on, or null. */
  currentStep: z.number().int().nullable(),
  /** The lesson timer in seconds at the last recorded step. */
  seconds: z.number().int(),
  firstStartedAt: z.date().nullable(),
  lastAt: z.date().nullable(),
  /** The class has taught the lesson and the student has not finished it. */
  late: z.boolean(),
  /** In progress with no activity for `STUCK_DAYS`. */
  stuck: z.boolean(),
  /** FR-7 fidelity signal: the student opened the lesson in the app before the class taught it. */
  openedBeforeTaught: z.boolean(),
});
export type ProgressCell = z.infer<typeof progressCellSchema>;

/** The class grid of one class book (FR-6). */
export const classBookProgressSchema = z.object({
  classBook: classBookSchema,
  students: z.array(progressStudentSchema),
  lessons: z.array(progressLessonSchema),
  cells: z.array(progressCellSchema),
});
export type ClassBookProgress = z.infer<typeof classBookProgressSchema>;

/** One app step of the student drill-down. */
export const studentStepSchema = z.object({
  appStep: z.number().int(),
  status: stepStatusSchema,
  startedAt: z.date().nullable(),
  doneAt: z.date().nullable(),
  seconds: z.number().int(),
});

/** The drill-down of one student in one class book (FR-6 click-through). */
export const studentLessonStepsSchema = z.object({
  classBook: classBookSchema,
  student: progressStudentSchema,
  lessons: z.array(progressLessonSchema.extend({ steps: z.array(studentStepSchema) })),
});
export type StudentLessonSteps = z.infer<typeof studentLessonStepsSchema>;
