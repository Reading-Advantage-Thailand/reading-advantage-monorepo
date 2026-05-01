import * as z from 'zod';
export const QuestionResponseGroupByResultSchema = z.array(z.object({
  id: z.string(),
  attemptId: z.string(),
  questionId: z.string(),
  studentAnswer: z.unknown(),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().int(),
  answeredAt: z.date(),
  order: z.number().int(),
  createdAt: z.date(),
  _count: z.object({
    id: z.number(),
    attemptId: z.number(),
    questionId: z.number(),
    studentAnswer: z.number(),
    isCorrect: z.number(),
    timeSpentSeconds: z.number(),
    answeredAt: z.number(),
    order: z.number(),
    attempt: z.number(),
    question: z.number(),
    createdAt: z.number()
  }).optional(),
  _sum: z.object({
    timeSpentSeconds: z.number().nullable(),
    order: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    timeSpentSeconds: z.number().nullable(),
    order: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    attemptId: z.string().nullable(),
    questionId: z.string().nullable(),
    timeSpentSeconds: z.number().int().nullable(),
    answeredAt: z.date().nullable(),
    order: z.number().int().nullable(),
    createdAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    attemptId: z.string().nullable(),
    questionId: z.string().nullable(),
    timeSpentSeconds: z.number().int().nullable(),
    answeredAt: z.date().nullable(),
    order: z.number().int().nullable(),
    createdAt: z.date().nullable()
  }).nullable().optional()
}));