import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { AchievementCountOrderByAggregateInputObjectSchema as AchievementCountOrderByAggregateInputObjectSchema } from './AchievementCountOrderByAggregateInput.schema';
import { AchievementMaxOrderByAggregateInputObjectSchema as AchievementMaxOrderByAggregateInputObjectSchema } from './AchievementMaxOrderByAggregateInput.schema';
import { AchievementMinOrderByAggregateInputObjectSchema as AchievementMinOrderByAggregateInputObjectSchema } from './AchievementMinOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  userId: SortOrderSchema.optional(),
  badgeType: SortOrderSchema.optional(),
  unlockedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => AchievementCountOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => AchievementMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => AchievementMinOrderByAggregateInputObjectSchema).optional()
}).strict();
export const AchievementOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.AchievementOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementOrderByWithAggregationInput>;
export const AchievementOrderByWithAggregationInputObjectZodSchema = makeSchema();
