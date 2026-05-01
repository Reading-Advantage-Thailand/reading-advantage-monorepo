import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { GamificationProfileCountOrderByAggregateInputObjectSchema as GamificationProfileCountOrderByAggregateInputObjectSchema } from './GamificationProfileCountOrderByAggregateInput.schema';
import { GamificationProfileAvgOrderByAggregateInputObjectSchema as GamificationProfileAvgOrderByAggregateInputObjectSchema } from './GamificationProfileAvgOrderByAggregateInput.schema';
import { GamificationProfileMaxOrderByAggregateInputObjectSchema as GamificationProfileMaxOrderByAggregateInputObjectSchema } from './GamificationProfileMaxOrderByAggregateInput.schema';
import { GamificationProfileMinOrderByAggregateInputObjectSchema as GamificationProfileMinOrderByAggregateInputObjectSchema } from './GamificationProfileMinOrderByAggregateInput.schema';
import { GamificationProfileSumOrderByAggregateInputObjectSchema as GamificationProfileSumOrderByAggregateInputObjectSchema } from './GamificationProfileSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  userId: SortOrderSchema.optional(),
  xp: SortOrderSchema.optional(),
  level: SortOrderSchema.optional(),
  streak: SortOrderSchema.optional(),
  lastActiveAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => GamificationProfileCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => GamificationProfileAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => GamificationProfileMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => GamificationProfileMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => GamificationProfileSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const GamificationProfileOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.GamificationProfileOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileOrderByWithAggregationInput>;
export const GamificationProfileOrderByWithAggregationInputObjectZodSchema = makeSchema();
