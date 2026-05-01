import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { AttemptCountOrderByAggregateInputObjectSchema as AttemptCountOrderByAggregateInputObjectSchema } from './AttemptCountOrderByAggregateInput.schema';
import { AttemptAvgOrderByAggregateInputObjectSchema as AttemptAvgOrderByAggregateInputObjectSchema } from './AttemptAvgOrderByAggregateInput.schema';
import { AttemptMaxOrderByAggregateInputObjectSchema as AttemptMaxOrderByAggregateInputObjectSchema } from './AttemptMaxOrderByAggregateInput.schema';
import { AttemptMinOrderByAggregateInputObjectSchema as AttemptMinOrderByAggregateInputObjectSchema } from './AttemptMinOrderByAggregateInput.schema';
import { AttemptSumOrderByAggregateInputObjectSchema as AttemptSumOrderByAggregateInputObjectSchema } from './AttemptSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  score: SortOrderSchema.optional(),
  maxScore: SortOrderSchema.optional(),
  attemptNumber: SortOrderSchema.optional(),
  startedAt: SortOrderSchema.optional(),
  completedAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => AttemptCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => AttemptAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => AttemptMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => AttemptMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => AttemptSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const AttemptOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.AttemptOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptOrderByWithAggregationInput>;
export const AttemptOrderByWithAggregationInputObjectZodSchema = makeSchema();
