import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  attemptId: z.literal(true).optional(),
  questionId: z.literal(true).optional(),
  isCorrect: z.literal(true).optional(),
  timeSpentSeconds: z.literal(true).optional(),
  answeredAt: z.literal(true).optional(),
  order: z.literal(true).optional(),
  createdAt: z.literal(true).optional()
}).strict();
export const QuestionResponseMaxAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseMaxAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseMaxAggregateInputType>;
export const QuestionResponseMaxAggregateInputObjectZodSchema = makeSchema();
