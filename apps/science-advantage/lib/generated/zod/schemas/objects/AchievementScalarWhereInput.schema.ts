import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema'

const achievementscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => AchievementScalarWhereInputObjectSchema), z.lazy(() => AchievementScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => AchievementScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => AchievementScalarWhereInputObjectSchema), z.lazy(() => AchievementScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  userId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  badgeType: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  unlockedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const AchievementScalarWhereInputObjectSchema: z.ZodType<Prisma.AchievementScalarWhereInput> = achievementscalarwhereinputSchema as unknown as z.ZodType<Prisma.AchievementScalarWhereInput>;
export const AchievementScalarWhereInputObjectZodSchema = achievementscalarwhereinputSchema;
