import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementUserIdBadgeTypeCompoundUniqueInputObjectSchema as AchievementUserIdBadgeTypeCompoundUniqueInputObjectSchema } from './AchievementUserIdBadgeTypeCompoundUniqueInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  userId_badgeType: z.lazy(() => AchievementUserIdBadgeTypeCompoundUniqueInputObjectSchema).optional()
}).strict();
export const AchievementWhereUniqueInputObjectSchema: z.ZodType<Prisma.AchievementWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementWhereUniqueInput>;
export const AchievementWhereUniqueInputObjectZodSchema = makeSchema();
