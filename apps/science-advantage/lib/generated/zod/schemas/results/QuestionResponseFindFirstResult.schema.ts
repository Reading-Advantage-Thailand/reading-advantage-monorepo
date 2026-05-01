import * as z from 'zod';
export const QuestionResponseFindFirstResultSchema = z.nullable(z.object({
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
}));