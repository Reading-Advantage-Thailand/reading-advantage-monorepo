import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  timeSpentSeconds: SortOrderSchema.optional(),
  order: SortOrderSchema.optional()
}).strict();
export const QuestionResponseSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseSumOrderByAggregateInput>;
export const QuestionResponseSumOrderByAggregateInputObjectZodSchema = makeSchema();
