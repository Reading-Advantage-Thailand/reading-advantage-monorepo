import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementWhereInputObjectSchema as AchievementWhereInputObjectSchema } from './AchievementWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => AchievementWhereInputObjectSchema).optional(),
  some: z.lazy(() => AchievementWhereInputObjectSchema).optional(),
  none: z.lazy(() => AchievementWhereInputObjectSchema).optional()
}).strict();
export const AchievementListRelationFilterObjectSchema: z.ZodType<Prisma.AchievementListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.AchievementListRelationFilter>;
export const AchievementListRelationFilterObjectZodSchema = makeSchema();
