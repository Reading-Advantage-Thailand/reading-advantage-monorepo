import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementSelectObjectSchema as AchievementSelectObjectSchema } from './objects/AchievementSelect.schema';
import { AchievementCreateManyInputObjectSchema as AchievementCreateManyInputObjectSchema } from './objects/AchievementCreateManyInput.schema';

export const AchievementCreateManyAndReturnSchema: z.ZodType<Prisma.AchievementCreateManyAndReturnArgs> = z.object({ select: AchievementSelectObjectSchema.optional(), data: z.union([ AchievementCreateManyInputObjectSchema, z.array(AchievementCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.AchievementCreateManyAndReturnArgs>;

export const AchievementCreateManyAndReturnZodSchema = z.object({ select: AchievementSelectObjectSchema.optional(), data: z.union([ AchievementCreateManyInputObjectSchema, z.array(AchievementCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();