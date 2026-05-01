import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  attemptId: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  status: SortOrderSchema.optional(),
  updatedCount: SortOrderSchema.optional(),
  lastError: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const MasteryRunMaxOrderByAggregateInputObjectSchema: z.ZodType<Prisma.MasteryRunMaxOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunMaxOrderByAggregateInput>;
export const MasteryRunMaxOrderByAggregateInputObjectZodSchema = makeSchema();
