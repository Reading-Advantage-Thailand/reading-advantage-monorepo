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
export const QuestionResponseMaxOrderByAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseMaxOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseMaxOrderByAggregateInput>;
export const QuestionResponseMaxOrderByAggregateInputObjectZodSchema = makeSchema();
