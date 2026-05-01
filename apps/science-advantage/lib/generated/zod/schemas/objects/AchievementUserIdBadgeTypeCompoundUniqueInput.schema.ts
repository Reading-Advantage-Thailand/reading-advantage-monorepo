import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  userId: z.string(),
  badgeType: z.string()
}).strict();
export const AchievementUserIdBadgeTypeCompoundUniqueInputObjectSchema: z.ZodType<Prisma.AchievementUserIdBadgeTypeCompoundUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUserIdBadgeTypeCompoundUniqueInput>;
export const AchievementUserIdBadgeTypeCompoundUniqueInputObjectZodSchema = makeSchema();
