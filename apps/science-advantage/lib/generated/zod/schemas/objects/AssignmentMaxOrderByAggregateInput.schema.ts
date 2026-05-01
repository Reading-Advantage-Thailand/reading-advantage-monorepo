import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  classId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  assignedAt: SortOrderSchema.optional(),
  dueAt: SortOrderSchema.optional(),
  assignedBy: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional()
}).strict();
export const AssignmentMaxOrderByAggregateInputObjectSchema: z.ZodType<Prisma.AssignmentMaxOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentMaxOrderByAggregateInput>;
export const AssignmentMaxOrderByAggregateInputObjectZodSchema = makeSchema();
