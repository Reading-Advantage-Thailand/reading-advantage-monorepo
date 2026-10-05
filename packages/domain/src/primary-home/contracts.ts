import { z } from "zod";

/** The next open assignment, shown as "today's lesson" until class books link lessons (Lane D+E). */
export const studentHomeLessonSchema = z.object({
  assignmentId: z.string(),
  title: z.string(),
  dueDate: z.date().nullable(),
  /** True when the student has opened the assignment (status IN_PROGRESS). */
  started: z.boolean(),
});

/** The last article the student opened and has not finished. */
export const studentHomeReadingSchema = z.object({
  articleId: z.string(),
  title: z.string(),
  cefrLevel: z.string().nullable(),
  raLevel: z.number().nullable(),
  lastReadAt: z.date(),
});

/**
 * Data for the Primary student home (FR-4). The function takes no external input: every
 * value is read for the signed-in student.
 */
export const studentHomeOutput = z.object({
  xp: z.number(),
  level: z.number(),
  cefrLevel: z.string().nullable(),
  /** Consecutive days with any activity, ending today or yesterday (see countStreakDays). */
  streakDays: z.number().int().nonnegative(),
  todayLesson: studentHomeLessonSchema.nullable(),
  continueReading: studentHomeReadingSchema.nullable(),
});

/** Data for the Primary student home. */
export type StudentHome = z.infer<typeof studentHomeOutput>;
