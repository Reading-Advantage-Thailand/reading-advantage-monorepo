import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  attemptId: SortOrderSchema.optional(),
  questionId: SortOrderSchema.optional(),
  isCorrect: SortOrderSchema.optional(),
  timeSpentSeconds: SortOrderSchema.optional(),
  answeredAt: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional()
}).strict();
export const QuestionResponseMinOrderByAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseMinOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseMinOrderByAggregateInput>;
export const QuestionResponseMinOrderByAggregateInputObjectZodSchema = makeSchema();
