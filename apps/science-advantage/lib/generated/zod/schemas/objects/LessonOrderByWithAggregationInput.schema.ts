import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { LessonCountOrderByAggregateInputObjectSchema as LessonCountOrderByAggregateInputObjectSchema } from './LessonCountOrderByAggregateInput.schema';
import { LessonAvgOrderByAggregateInputObjectSchema as LessonAvgOrderByAggregateInputObjectSchema } from './LessonAvgOrderByAggregateInput.schema';
import { LessonMaxOrderByAggregateInputObjectSchema as LessonMaxOrderByAggregateInputObjectSchema } from './LessonMaxOrderByAggregateInput.schema';
import { LessonMinOrderByAggregateInputObjectSchema as LessonMinOrderByAggregateInputObjectSchema } from './LessonMinOrderByAggregateInput.schema';
import { LessonSumOrderByAggregateInputObjectSchema as LessonSumOrderByAggregateInputObjectSchema } from './LessonSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  title: SortOrderSchema.optional(),
  titleThai: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  description: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  descriptionThai: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  content: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  structuredContent: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  lessonType: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => LessonCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => LessonAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => LessonMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => LessonMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => LessonSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const LessonOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.LessonOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonOrderByWithAggregationInput>;
export const LessonOrderByWithAggregationInputObjectZodSchema = makeSchema();
