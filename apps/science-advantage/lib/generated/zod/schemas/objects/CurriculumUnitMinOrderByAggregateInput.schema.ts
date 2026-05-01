import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  title: SortOrderSchema.optional(),
  description: SortOrderSchema.optional(),
  framework: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  classId: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const CurriculumUnitMinOrderByAggregateInputObjectSchema: z.ZodType<Prisma.CurriculumUnitMinOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitMinOrderByAggregateInput>;
export const CurriculumUnitMinOrderByAggregateInputObjectZodSchema = makeSchema();
