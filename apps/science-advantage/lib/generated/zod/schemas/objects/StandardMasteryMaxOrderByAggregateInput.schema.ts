import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  standardId: SortOrderSchema.optional(),
  masteryLevel: SortOrderSchema.optional(),
  evidenceCount: SortOrderSchema.optional(),
  lastAssessedAt: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const StandardMasteryMaxOrderByAggregateInputObjectSchema: z.ZodType<Prisma.StandardMasteryMaxOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryMaxOrderByAggregateInput>;
export const StandardMasteryMaxOrderByAggregateInputObjectZodSchema = makeSchema();
