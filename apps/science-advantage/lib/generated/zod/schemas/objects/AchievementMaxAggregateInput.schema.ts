import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  userId: z.literal(true).optional(),
  badgeType: z.literal(true).optional(),
  unlockedAt: z.literal(true).optional()
}).strict();
export const AchievementMaxAggregateInputObjectSchema: z.ZodType<Prisma.AchievementMaxAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.AchievementMaxAggregateInputType>;
export const AchievementMaxAggregateInputObjectZodSchema = makeSchema();
