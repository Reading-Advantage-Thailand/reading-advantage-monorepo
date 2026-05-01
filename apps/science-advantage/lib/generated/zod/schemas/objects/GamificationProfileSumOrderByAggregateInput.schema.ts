import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  xp: SortOrderSchema.optional(),
  level: SortOrderSchema.optional(),
  streak: SortOrderSchema.optional()
}).strict();
export const GamificationProfileSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.GamificationProfileSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileSumOrderByAggregateInput>;
export const GamificationProfileSumOrderByAggregateInputObjectZodSchema = makeSchema();
