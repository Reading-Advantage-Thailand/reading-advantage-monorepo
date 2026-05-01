import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { UserScalarRelationFilterObjectSchema as UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const achievementwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => AchievementWhereInputObjectSchema), z.lazy(() => AchievementWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => AchievementWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => AchievementWhereInputObjectSchema), z.lazy(() => AchievementWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  userId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  badgeType: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  unlockedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  user: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => userWhereInputObjectSchema)]).optional()
}).strict();
export const AchievementWhereInputObjectSchema: z.ZodType<Prisma.AchievementWhereInput> = achievementwhereinputSchema as unknown as z.ZodType<Prisma.AchievementWhereInput>;
export const AchievementWhereInputObjectZodSchema = achievementwhereinputSchema;
