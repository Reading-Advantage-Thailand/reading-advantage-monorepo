import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  attemptId: SortOrderSchema.optional(),
  questionId: SortOrderSchema.optional(),
  studentAnswer: SortOrderSchema.optional(),
  isCorrect: SortOrderSchema.optional(),
  timeSpentSeconds: SortOrderSchema.optional(),
  answeredAt: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional()
}).strict();
export const QuestionResponseCountOrderByAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseCountOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseCountOrderByAggregateInput>;
export const QuestionResponseCountOrderByAggregateInputObjectZodSchema = makeSchema();
