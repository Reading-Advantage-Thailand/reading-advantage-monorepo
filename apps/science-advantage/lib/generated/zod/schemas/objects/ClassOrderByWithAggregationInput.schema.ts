import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { ClassCountOrderByAggregateInputObjectSchema as ClassCountOrderByAggregateInputObjectSchema } from './ClassCountOrderByAggregateInput.schema';
import { ClassAvgOrderByAggregateInputObjectSchema as ClassAvgOrderByAggregateInputObjectSchema } from './ClassAvgOrderByAggregateInput.schema';
import { ClassMaxOrderByAggregateInputObjectSchema as ClassMaxOrderByAggregateInputObjectSchema } from './ClassMaxOrderByAggregateInput.schema';
import { ClassMinOrderByAggregateInputObjectSchema as ClassMinOrderByAggregateInputObjectSchema } from './ClassMinOrderByAggregateInput.schema';
import { ClassSumOrderByAggregateInputObjectSchema as ClassSumOrderByAggregateInputObjectSchema } from './ClassSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  name: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  standardsAlignment: SortOrderSchema.optional(),
  joinCode: SortOrderSchema.optional(),
  teacherId: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => ClassCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => ClassAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => ClassMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => ClassMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => ClassSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const ClassOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.ClassOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassOrderByWithAggregationInput>;
export const ClassOrderByWithAggregationInputObjectZodSchema = makeSchema();
