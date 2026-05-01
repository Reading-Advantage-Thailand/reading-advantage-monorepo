import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  timeSpentSeconds: SortOrderSchema.optional(),
  order: SortOrderSchema.optional()
}).strict();
export const QuestionResponseAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseAvgOrderByAggregateInput>;
export const QuestionResponseAvgOrderByAggregateInputObjectZodSchema = makeSchema();
