import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  userId: z.literal(true).optional(),
  badgeType: z.literal(true).optional(),
  unlockedAt: z.literal(true).optional(),
  _all: z.literal(true).optional()
}).strict();
export const AchievementCountAggregateInputObjectSchema: z.ZodType<Prisma.AchievementCountAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.AchievementCountAggregateInputType>;
export const AchievementCountAggregateInputObjectZodSchema = makeSchema();
