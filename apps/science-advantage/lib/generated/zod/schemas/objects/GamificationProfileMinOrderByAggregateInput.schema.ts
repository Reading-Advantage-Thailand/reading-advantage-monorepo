import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  userId: SortOrderSchema.optional(),
  xp: SortOrderSchema.optional(),
  level: SortOrderSchema.optional(),
  streak: SortOrderSchema.optional(),
  lastActiveAt: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const GamificationProfileMinOrderByAggregateInputObjectSchema: z.ZodType<Prisma.GamificationProfileMinOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileMinOrderByAggregateInput>;
export const GamificationProfileMinOrderByAggregateInputObjectZodSchema = makeSchema();
