import * as z from 'zod';
export const LessonCompletionFindManyResultSchema = z.object({
  data: z.array(z.object({
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
})),
  pagination: z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
})
});