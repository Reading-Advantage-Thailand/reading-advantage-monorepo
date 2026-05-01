import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  type: SortOrderSchema.optional(),
  text: SortOrderSchema.optional(),
  points: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  version: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const QuizQuestionMaxOrderByAggregateInputObjectSchema: z.ZodType<Prisma.QuizQuestionMaxOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionMaxOrderByAggregateInput>;
export const QuizQuestionMaxOrderByAggregateInputObjectZodSchema = makeSchema();
