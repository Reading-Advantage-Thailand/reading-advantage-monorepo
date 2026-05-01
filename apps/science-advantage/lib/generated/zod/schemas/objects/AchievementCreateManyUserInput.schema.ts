import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  badgeType: z.string(),
  unlockedAt: z.coerce.date().optional()
}).strict();
export const AchievementCreateManyUserInputObjectSchema: z.ZodType<Prisma.AchievementCreateManyUserInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementCreateManyUserInput>;
export const AchievementCreateManyUserInputObjectZodSchema = makeSchema();
