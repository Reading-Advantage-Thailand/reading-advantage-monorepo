import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { StandardMasteryCountOrderByAggregateInputObjectSchema as StandardMasteryCountOrderByAggregateInputObjectSchema } from './StandardMasteryCountOrderByAggregateInput.schema';
import { StandardMasteryAvgOrderByAggregateInputObjectSchema as StandardMasteryAvgOrderByAggregateInputObjectSchema } from './StandardMasteryAvgOrderByAggregateInput.schema';
import { StandardMasteryMaxOrderByAggregateInputObjectSchema as StandardMasteryMaxOrderByAggregateInputObjectSchema } from './StandardMasteryMaxOrderByAggregateInput.schema';
import { StandardMasteryMinOrderByAggregateInputObjectSchema as StandardMasteryMinOrderByAggregateInputObjectSchema } from './StandardMasteryMinOrderByAggregateInput.schema';
import { StandardMasterySumOrderByAggregateInputObjectSchema as StandardMasterySumOrderByAggregateInputObjectSchema } from './StandardMasterySumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  standardId: SortOrderSchema.optional(),
  masteryLevel: SortOrderSchema.optional(),
  evidenceCount: SortOrderSchema.optional(),
  lastAssessedAt: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => StandardMasteryCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => StandardMasteryAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => StandardMasteryMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => StandardMasteryMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => StandardMasterySumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const StandardMasteryOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.StandardMasteryOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryOrderByWithAggregationInput>;
export const StandardMasteryOrderByWithAggregationInputObjectZodSchema = makeSchema();
