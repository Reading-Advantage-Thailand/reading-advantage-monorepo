import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateNestedOneWithoutAchievementsInputObjectSchema as userCreateNestedOneWithoutAchievementsInputObjectSchema } from './userCreateNestedOneWithoutAchievementsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  badgeType: z.string(),
  unlockedAt: z.coerce.date().optional(),
  user: z.lazy(() => userCreateNestedOneWithoutAchievementsInputObjectSchema)
}).strict();
export const AchievementCreateInputObjectSchema: z.ZodType<Prisma.AchievementCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementCreateInput>;
export const AchievementCreateInputObjectZodSchema = makeSchema();
