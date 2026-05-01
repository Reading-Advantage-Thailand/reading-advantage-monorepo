import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  title: SortOrderSchema.optional(),
  titleThai: SortOrderSchema.optional(),
  description: SortOrderSchema.optional(),
  descriptionThai: SortOrderSchema.optional(),
  content: SortOrderSchema.optional(),
  lessonType: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const LessonMaxOrderByAggregateInputObjectSchema: z.ZodType<Prisma.LessonMaxOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonMaxOrderByAggregateInput>;
export const LessonMaxOrderByAggregateInputObjectZodSchema = makeSchema();
