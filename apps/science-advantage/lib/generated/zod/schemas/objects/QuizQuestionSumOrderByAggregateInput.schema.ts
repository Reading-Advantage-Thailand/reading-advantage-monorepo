import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  points: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  version: SortOrderSchema.optional()
}).strict();
export const QuizQuestionSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.QuizQuestionSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionSumOrderByAggregateInput>;
export const QuizQuestionSumOrderByAggregateInputObjectZodSchema = makeSchema();
