import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { MasteryRunCountOrderByAggregateInputObjectSchema as MasteryRunCountOrderByAggregateInputObjectSchema } from './MasteryRunCountOrderByAggregateInput.schema';
import { MasteryRunAvgOrderByAggregateInputObjectSchema as MasteryRunAvgOrderByAggregateInputObjectSchema } from './MasteryRunAvgOrderByAggregateInput.schema';
import { MasteryRunMaxOrderByAggregateInputObjectSchema as MasteryRunMaxOrderByAggregateInputObjectSchema } from './MasteryRunMaxOrderByAggregateInput.schema';
import { MasteryRunMinOrderByAggregateInputObjectSchema as MasteryRunMinOrderByAggregateInputObjectSchema } from './MasteryRunMinOrderByAggregateInput.schema';
import { MasteryRunSumOrderByAggregateInputObjectSchema as MasteryRunSumOrderByAggregateInputObjectSchema } from './MasteryRunSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  attemptId: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  status: SortOrderSchema.optional(),
  updatedCount: SortOrderSchema.optional(),
  lastError: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => MasteryRunCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => MasteryRunAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => MasteryRunMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => MasteryRunMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => MasteryRunSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const MasteryRunOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.MasteryRunOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunOrderByWithAggregationInput>;
export const MasteryRunOrderByWithAggregationInputObjectZodSchema = makeSchema();
