import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementCreateManyInputObjectSchema as AchievementCreateManyInputObjectSchema } from './objects/AchievementCreateManyInput.schema';

export const AchievementCreateManySchema: z.ZodType<Prisma.AchievementCreateManyArgs> = z.object({ data: z.union([ AchievementCreateManyInputObjectSchema, z.array(AchievementCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.AchievementCreateManyArgs>;

export const AchievementCreateManyZodSchema = z.object({ data: z.union([ AchievementCreateManyInputObjectSchema, z.array(AchievementCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();