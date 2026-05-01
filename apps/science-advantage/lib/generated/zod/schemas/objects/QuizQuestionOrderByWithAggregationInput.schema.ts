import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { QuizQuestionCountOrderByAggregateInputObjectSchema as QuizQuestionCountOrderByAggregateInputObjectSchema } from './QuizQuestionCountOrderByAggregateInput.schema';
import { QuizQuestionAvgOrderByAggregateInputObjectSchema as QuizQuestionAvgOrderByAggregateInputObjectSchema } from './QuizQuestionAvgOrderByAggregateInput.schema';
import { QuizQuestionMaxOrderByAggregateInputObjectSchema as QuizQuestionMaxOrderByAggregateInputObjectSchema } from './QuizQuestionMaxOrderByAggregateInput.schema';
import { QuizQuestionMinOrderByAggregateInputObjectSchema as QuizQuestionMinOrderByAggregateInputObjectSchema } from './QuizQuestionMinOrderByAggregateInput.schema';
import { QuizQuestionSumOrderByAggregateInputObjectSchema as QuizQuestionSumOrderByAggregateInputObjectSchema } from './QuizQuestionSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  type: SortOrderSchema.optional(),
  text: SortOrderSchema.optional(),
  options: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  correctAnswer: SortOrderSchema.optional(),
  points: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  version: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => QuizQuestionCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => QuizQuestionAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => QuizQuestionMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => QuizQuestionMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => QuizQuestionSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const QuizQuestionOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.QuizQuestionOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionOrderByWithAggregationInput>;
export const QuizQuestionOrderByWithAggregationInputObjectZodSchema = makeSchema();
