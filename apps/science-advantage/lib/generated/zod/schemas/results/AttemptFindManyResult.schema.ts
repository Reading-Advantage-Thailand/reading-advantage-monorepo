import * as z from 'zod';
export const AttemptFindManyResultSchema = z.object({
  data: z.array(z.object({
  id: z.string(),
  studentId: z.string(),
  lessonId: z.string(),
  score: z.number(),
  maxScore: z.number(),
  attemptNumber: z.number().int(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  student: z.unknown(),
  lesson: z.unknown(),
  questionResponses: z.array(z.unknown()),
  masteryRun: z.unknown().optional(),
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