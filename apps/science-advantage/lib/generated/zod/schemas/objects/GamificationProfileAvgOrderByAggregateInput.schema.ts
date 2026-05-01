import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  xp: SortOrderSchema.optional(),
  level: SortOrderSchema.optional(),
  streak: SortOrderSchema.optional()
}).strict();
export const GamificationProfileAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.GamificationProfileAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileAvgOrderByAggregateInput>;
export const GamificationProfileAvgOrderByAggregateInputObjectZodSchema = makeSchema();
