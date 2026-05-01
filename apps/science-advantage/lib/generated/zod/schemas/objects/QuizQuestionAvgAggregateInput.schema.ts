import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  points: z.literal(true).optional(),
  order: z.literal(true).optional(),
  version: z.literal(true).optional()
}).strict();
export const QuizQuestionAvgAggregateInputObjectSchema: z.ZodType<Prisma.QuizQuestionAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionAvgAggregateInputType>;
export const QuizQuestionAvgAggregateInputObjectZodSchema = makeSchema();
