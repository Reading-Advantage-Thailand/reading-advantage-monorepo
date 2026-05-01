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
export const GamificationProfileCountOrderByAggregateInputObjectSchema: z.ZodType<Prisma.GamificationProfileCountOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileCountOrderByAggregateInput>;
export const GamificationProfileCountOrderByAggregateInputObjectZodSchema = makeSchema();
