import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  userId: SortOrderSchema.optional(),
  badgeType: SortOrderSchema.optional(),
  unlockedAt: SortOrderSchema.optional()
}).strict();
export const AchievementCountOrderByAggregateInputObjectSchema: z.ZodType<Prisma.AchievementCountOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementCountOrderByAggregateInput>;
export const AchievementCountOrderByAggregateInputObjectZodSchema = makeSchema();
