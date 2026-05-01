import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { StandardCountOrderByAggregateInputObjectSchema as StandardCountOrderByAggregateInputObjectSchema } from './StandardCountOrderByAggregateInput.schema';
import { StandardAvgOrderByAggregateInputObjectSchema as StandardAvgOrderByAggregateInputObjectSchema } from './StandardAvgOrderByAggregateInput.schema';
import { StandardMaxOrderByAggregateInputObjectSchema as StandardMaxOrderByAggregateInputObjectSchema } from './StandardMaxOrderByAggregateInput.schema';
import { StandardMinOrderByAggregateInputObjectSchema as StandardMinOrderByAggregateInputObjectSchema } from './StandardMinOrderByAggregateInput.schema';
import { StandardSumOrderByAggregateInputObjectSchema as StandardSumOrderByAggregateInputObjectSchema } from './StandardSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  framework: SortOrderSchema.optional(),
  code: SortOrderSchema.optional(),
  description: SortOrderSchema.optional(),
  gradeLevel: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  _count: z.lazy(() => StandardCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => StandardAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => StandardMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => StandardMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => StandardSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const StandardOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.StandardOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardOrderByWithAggregationInput>;
export const StandardOrderByWithAggregationInputObjectZodSchema = makeSchema();
