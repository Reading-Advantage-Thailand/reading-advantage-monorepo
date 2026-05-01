import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { QuestionResponseCountOrderByAggregateInputObjectSchema as QuestionResponseCountOrderByAggregateInputObjectSchema } from './QuestionResponseCountOrderByAggregateInput.schema';
import { QuestionResponseAvgOrderByAggregateInputObjectSchema as QuestionResponseAvgOrderByAggregateInputObjectSchema } from './QuestionResponseAvgOrderByAggregateInput.schema';
import { QuestionResponseMaxOrderByAggregateInputObjectSchema as QuestionResponseMaxOrderByAggregateInputObjectSchema } from './QuestionResponseMaxOrderByAggregateInput.schema';
import { QuestionResponseMinOrderByAggregateInputObjectSchema as QuestionResponseMinOrderByAggregateInputObjectSchema } from './QuestionResponseMinOrderByAggregateInput.schema';
import { QuestionResponseSumOrderByAggregateInputObjectSchema as QuestionResponseSumOrderByAggregateInputObjectSchema } from './QuestionResponseSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  attemptId: SortOrderSchema.optional(),
  questionId: SortOrderSchema.optional(),
  studentAnswer: SortOrderSchema.optional(),
  isCorrect: SortOrderSchema.optional(),
  timeSpentSeconds: SortOrderSchema.optional(),
  answeredAt: SortOrderSchema.optional(),
  order: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  _count: z.lazy(() => QuestionResponseCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => QuestionResponseAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => QuestionResponseMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => QuestionResponseMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => QuestionResponseSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const QuestionResponseOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.QuestionResponseOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseOrderByWithAggregationInput>;
export const QuestionResponseOrderByWithAggregationInputObjectZodSchema = makeSchema();
