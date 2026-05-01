import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementSelectObjectSchema as AchievementSelectObjectSchema } from './AchievementSelect.schema';
import { AchievementIncludeObjectSchema as AchievementIncludeObjectSchema } from './AchievementInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => AchievementSelectObjectSchema).optional(),
  include: z.lazy(() => AchievementIncludeObjectSchema).optional()
}).strict();
export const AchievementArgsObjectSchema = makeSchema();
export const AchievementArgsObjectZodSchema = makeSchema();
