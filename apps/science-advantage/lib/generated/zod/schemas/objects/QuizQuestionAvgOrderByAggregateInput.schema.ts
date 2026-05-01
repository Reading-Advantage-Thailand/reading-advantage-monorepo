import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  points: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  version: SortOrderSchema.optional()
}).strict();
export const QuizQuestionAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.QuizQuestionAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionAvgOrderByAggregateInput>;
export const QuizQuestionAvgOrderByAggregateInputObjectZodSchema = makeSchema();
