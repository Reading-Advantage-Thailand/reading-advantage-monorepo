import * as z from 'zod';
export const LessonCompletionCreateResultSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  lessonId: z.string(),
  status: z.unknown(),
  completedAt: z.date().optional(),
  attemptsCount: z.number().int(),
  bestScore: z.number().optional(),
  bestScorePercentage: z.number().optional(),
  mostRecentScore: z.number().optional(),
  mostRecentScorePercentage: z.number().optional(),
  totalTimeSpentSeconds: z.number().int(),
  lastAttemptAt: z.date().optional(),
  student: z.unknown(),
  lesson: z.unknown(),
  createdAt: z.date(),
  updatedAt: z.date()
});