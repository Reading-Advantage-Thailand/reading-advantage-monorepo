import { z } from "zod";

/** The 10 activity types that a lesson attempt owns (the legacy reset list). */
export const LESSON_ACTIVITY_TYPES = [
  "MC_QUESTION",
  "SA_QUESTION",
  "LA_QUESTION",
  "SENTENCE_FLASHCARDS",
  "SENTENCE_MATCHING",
  "SENTENCE_ORDERING",
  "SENTENCE_WORD_ORDERING",
  "SENTENCE_CLOZE_TEST",
  "VOCABULARY_FLASHCARDS",
  "VOCABULARY_MATCHING",
] as const;

/** Why an attempt closed. `legacy_import` marks an attempt that the legacy ETL created. */
export const closeReasonSchema = z.enum(["student_restart", "teacher_teach_again", "legacy_import"]);
export type CloseReason = z.infer<typeof closeReasonSchema>;

/** Input of `closeLessonAttempt`: one student, one article, and the optional lesson links. */
export const closeLessonAttemptInput = z.object({
  studentId: z.string().min(1),
  articleId: z.string().uuid(),
  assignmentId: z.string().uuid().nullish(),
  classBookId: z.string().uuid().nullish(),
  lessonNumber: z.number().int().positive().nullish(),
  reason: closeReasonSchema,
});
export type CloseLessonAttemptInput = z.input<typeof closeLessonAttemptInput>;

/** The result of a close: `closed` is false when the student had no work to move. */
export const closeLessonAttemptOutput = z.object({
  closed: z.boolean(),
  attemptNumber: z.number().int().nullable(),
});
export type CloseLessonAttemptOutput = z.infer<typeof closeLessonAttemptOutput>;

/** One closed attempt as the reports read it. */
export const lessonAttemptSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string(),
  articleId: z.string().uuid(),
  assignmentId: z.string().uuid().nullable(),
  classBookId: z.string().uuid().nullable(),
  lessonNumber: z.number().int().nullable(),
  attemptNumber: z.number().int(),
  startedAt: z.date().nullable(),
  closedAt: z.date(),
  closeReason: closeReasonSchema,
  progress: z.number().int(),
  timeSpent: z.number().int(),
  completed: z.boolean(),
  completedAt: z.date().nullable(),
  score: z.number().int().nullable(),
  xpEarned: z.number().int(),
});
export type LessonAttempt = z.infer<typeof lessonAttemptSchema>;

/** Input of `restartLesson`: the article, and the assignment when the lesson runs from one. */
export const restartLessonInput = z.object({
  articleId: z.string().uuid(),
  assignmentId: z.string().uuid().nullish(),
});
export type RestartLessonInput = z.input<typeof restartLessonInput>;

/** The result of a restart: `attemptNumber` is the number of the NEW current attempt, or null when nothing closed. */
export const restartLessonOutput = z.object({
  closed: z.boolean(),
  attemptNumber: z.number().int().nullable(),
});
export type RestartLessonOutput = z.infer<typeof restartLessonOutput>;
