import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  badgeType: z.boolean().optional(),
  unlockedAt: z.boolean().optional(),
  user: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional()
}).strict();
export const AchievementSelectObjectSchema: z.ZodType<Prisma.AchievementSelect> = makeSchema() as unknown as z.ZodType<Prisma.AchievementSelect>;
export const AchievementSelectObjectZodSchema = makeSchema();
