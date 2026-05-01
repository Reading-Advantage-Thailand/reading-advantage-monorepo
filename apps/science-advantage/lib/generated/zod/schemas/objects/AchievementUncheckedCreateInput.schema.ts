import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  userId: z.string(),
  badgeType: z.string(),
  unlockedAt: z.coerce.date().optional()
}).strict();
export const AchievementUncheckedCreateInputObjectSchema: z.ZodType<Prisma.AchievementUncheckedCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUncheckedCreateInput>;
export const AchievementUncheckedCreateInputObjectZodSchema = makeSchema();
