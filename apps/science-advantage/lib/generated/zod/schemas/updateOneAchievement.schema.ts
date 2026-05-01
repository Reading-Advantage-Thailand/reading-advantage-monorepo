import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementSelectObjectSchema as AchievementSelectObjectSchema } from './objects/AchievementSelect.schema';
import { AchievementIncludeObjectSchema as AchievementIncludeObjectSchema } from './objects/AchievementInclude.schema';
import { AchievementUpdateInputObjectSchema as AchievementUpdateInputObjectSchema } from './objects/AchievementUpdateInput.schema';
import { AchievementUncheckedUpdateInputObjectSchema as AchievementUncheckedUpdateInputObjectSchema } from './objects/AchievementUncheckedUpdateInput.schema';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './objects/AchievementWhereUniqueInput.schema';

export const AchievementUpdateOneSchema: z.ZodType<Prisma.AchievementUpdateArgs> = z.object({ select: AchievementSelectObjectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), data: z.union([AchievementUpdateInputObjectSchema, AchievementUncheckedUpdateInputObjectSchema]), where: AchievementWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.AchievementUpdateArgs>;

export const AchievementUpdateOneZodSchema = z.object({ select: AchievementSelectObjectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), data: z.union([AchievementUpdateInputObjectSchema, AchievementUncheckedUpdateInputObjectSchema]), where: AchievementWhereUniqueInputObjectSchema }).strict();