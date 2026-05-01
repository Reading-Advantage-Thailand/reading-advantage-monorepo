import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  name: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  standardsAlignment: SortOrderSchema.optional(),
  joinCode: SortOrderSchema.optional(),
  teacherId: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const ClassCountOrderByAggregateInputObjectSchema: z.ZodType<Prisma.ClassCountOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCountOrderByAggregateInput>;
export const ClassCountOrderByAggregateInputObjectZodSchema = makeSchema();
