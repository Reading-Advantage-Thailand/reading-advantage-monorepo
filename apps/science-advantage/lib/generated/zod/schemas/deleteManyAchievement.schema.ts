import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementWhereInputObjectSchema as AchievementWhereInputObjectSchema } from './objects/AchievementWhereInput.schema';

export const AchievementDeleteManySchema: z.ZodType<Prisma.AchievementDeleteManyArgs> = z.object({ where: AchievementWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.AchievementDeleteManyArgs>;

export const AchievementDeleteManyZodSchema = z.object({ where: AchievementWhereInputObjectSchema.optional() }).strict();