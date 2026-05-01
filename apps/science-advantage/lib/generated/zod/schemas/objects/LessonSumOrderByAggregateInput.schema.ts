import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  gradeLevel: SortOrderSchema.optional(),
  order: SortOrderSchema.optional()
}).strict();
export const LessonSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.LessonSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonSumOrderByAggregateInput>;
export const LessonSumOrderByAggregateInputObjectZodSchema = makeSchema();
