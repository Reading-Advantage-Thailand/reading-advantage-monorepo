import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  userId: z.string(),
  badgeType: z.string(),
  unlockedAt: z.coerce.date().optional()
}).strict();
export const AchievementCreateManyInputObjectSchema: z.ZodType<Prisma.AchievementCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementCreateManyInput>;
export const AchievementCreateManyInputObjectZodSchema = makeSchema();
