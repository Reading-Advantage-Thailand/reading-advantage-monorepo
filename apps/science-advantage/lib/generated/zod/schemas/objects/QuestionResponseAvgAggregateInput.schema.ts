import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  timeSpentSeconds: z.literal(true).optional(),
  order: z.literal(true).optional()
}).strict();
export const QuestionResponseAvgAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseAvgAggregateInputType>;
export const QuestionResponseAvgAggregateInputObjectZodSchema = makeSchema();
