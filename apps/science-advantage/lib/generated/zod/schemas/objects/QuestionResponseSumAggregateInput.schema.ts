import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  timeSpentSeconds: z.literal(true).optional(),
  order: z.literal(true).optional()
}).strict();
export const QuestionResponseSumAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseSumAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseSumAggregateInputType>;
export const QuestionResponseSumAggregateInputObjectZodSchema = makeSchema();
