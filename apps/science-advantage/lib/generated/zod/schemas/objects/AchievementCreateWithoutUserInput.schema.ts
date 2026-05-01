import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  badgeType: z.string(),
  unlockedAt: z.coerce.date().optional()
}).strict();
export const AchievementCreateWithoutUserInputObjectSchema: z.ZodType<Prisma.AchievementCreateWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementCreateWithoutUserInput>;
export const AchievementCreateWithoutUserInputObjectZodSchema = makeSchema();
