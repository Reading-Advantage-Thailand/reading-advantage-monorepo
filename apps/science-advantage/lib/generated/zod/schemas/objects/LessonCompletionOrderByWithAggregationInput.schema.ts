import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { LessonCompletionCountOrderByAggregateInputObjectSchema as LessonCompletionCountOrderByAggregateInputObjectSchema } from './LessonCompletionCountOrderByAggregateInput.schema';
import { LessonCompletionAvgOrderByAggregateInputObjectSchema as LessonCompletionAvgOrderByAggregateInputObjectSchema } from './LessonCompletionAvgOrderByAggregateInput.schema';
import { LessonCompletionMaxOrderByAggregateInputObjectSchema as LessonCompletionMaxOrderByAggregateInputObjectSchema } from './LessonCompletionMaxOrderByAggregateInput.schema';
import { LessonCompletionMinOrderByAggregateInputObjectSchema as LessonCompletionMinOrderByAggregateInputObjectSchema } from './LessonCompletionMinOrderByAggregateInput.schema';
import { LessonCompletionSumOrderByAggregateInputObjectSchema as LessonCompletionSumOrderByAggregateInputObjectSchema } from './LessonCompletionSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  status: SortOrderSchema.optional(),
  completedAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  attemptsCount: SortOrderSchema.optional(),
  bestScore: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  bestScorePercentage: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  mostRecentScore: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  mostRecentScorePercentage: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  totalTimeSpentSeconds: SortOrderSchema.optional(),
  lastAttemptAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => LessonCompletionCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => LessonCompletionAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => LessonCompletionMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => LessonCompletionMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => LessonCompletionSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const LessonCompletionOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.LessonCompletionOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionOrderByWithAggregationInput>;
export const LessonCompletionOrderByWithAggregationInputObjectZodSchema = makeSchema();
