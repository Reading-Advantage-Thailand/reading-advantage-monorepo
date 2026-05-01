import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema'

const makeSchema = () => z.object({
  user: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional()
}).strict();
export const AchievementIncludeObjectSchema: z.ZodType<Prisma.AchievementInclude> = makeSchema() as unknown as z.ZodType<Prisma.AchievementInclude>;
export const AchievementIncludeObjectZodSchema = makeSchema();
