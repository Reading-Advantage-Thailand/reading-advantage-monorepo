import * as z from 'zod';
export const QuestionResponseFindManyResultSchema = z.object({
  data: z.array(z.object({
  id: z.string(),
  attemptId: z.string(),
  questionId: z.string(),
  studentAnswer: z.unknown(),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().int(),
  answeredAt: z.date(),
  order: z.number().int().optional(),
  attempt: z.unknown(),
  question: z.unknown(),
  createdAt: z.date()
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