import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { CurriculumUnitCountOrderByAggregateInputObjectSchema as CurriculumUnitCountOrderByAggregateInputObjectSchema } from './CurriculumUnitCountOrderByAggregateInput.schema';
import { CurriculumUnitAvgOrderByAggregateInputObjectSchema as CurriculumUnitAvgOrderByAggregateInputObjectSchema } from './CurriculumUnitAvgOrderByAggregateInput.schema';
import { CurriculumUnitMaxOrderByAggregateInputObjectSchema as CurriculumUnitMaxOrderByAggregateInputObjectSchema } from './CurriculumUnitMaxOrderByAggregateInput.schema';
import { CurriculumUnitMinOrderByAggregateInputObjectSchema as CurriculumUnitMinOrderByAggregateInputObjectSchema } from './CurriculumUnitMinOrderByAggregateInput.schema';
import { CurriculumUnitSumOrderByAggregateInputObjectSchema as CurriculumUnitSumOrderByAggregateInputObjectSchema } from './CurriculumUnitSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  title: SortOrderSchema.optional(),
  description: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  framework: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  classId: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => CurriculumUnitCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => CurriculumUnitAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => CurriculumUnitMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => CurriculumUnitMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => CurriculumUnitSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const CurriculumUnitOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.CurriculumUnitOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitOrderByWithAggregationInput>;
export const CurriculumUnitOrderByWithAggregationInputObjectZodSchema = makeSchema();
