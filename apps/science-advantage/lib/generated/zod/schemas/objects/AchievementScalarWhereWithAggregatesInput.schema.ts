import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const achievementscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => AchievementScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => AchievementScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => AchievementScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => AchievementScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => AchievementScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  userId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  badgeType: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  unlockedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const AchievementScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.AchievementScalarWhereWithAggregatesInput> = achievementscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.AchievementScalarWhereWithAggregatesInput>;
export const AchievementScalarWhereWithAggregatesInputObjectZodSchema = achievementscalarwherewithaggregatesinputSchema;
