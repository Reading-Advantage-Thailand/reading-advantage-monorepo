import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './userOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  userId: SortOrderSchema.optional(),
  badgeType: SortOrderSchema.optional(),
  unlockedAt: SortOrderSchema.optional(),
  user: z.lazy(() => userOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const AchievementOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.AchievementOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementOrderByWithRelationInput>;
export const AchievementOrderByWithRelationInputObjectZodSchema = makeSchema();
