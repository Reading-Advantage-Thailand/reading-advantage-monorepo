import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementSelectObjectSchema as AchievementSelectObjectSchema } from './objects/AchievementSelect.schema';
import { AchievementIncludeObjectSchema as AchievementIncludeObjectSchema } from './objects/AchievementInclude.schema';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './objects/AchievementWhereUniqueInput.schema';
import { AchievementCreateInputObjectSchema as AchievementCreateInputObjectSchema } from './objects/AchievementCreateInput.schema';
import { AchievementUncheckedCreateInputObjectSchema as AchievementUncheckedCreateInputObjectSchema } from './objects/AchievementUncheckedCreateInput.schema';
import { AchievementUpdateInputObjectSchema as AchievementUpdateInputObjectSchema } from './objects/AchievementUpdateInput.schema';
import { AchievementUncheckedUpdateInputObjectSchema as AchievementUncheckedUpdateInputObjectSchema } from './objects/AchievementUncheckedUpdateInput.schema';

export const AchievementUpsertOneSchema: z.ZodType<Prisma.AchievementUpsertArgs> = z.object({ select: AchievementSelectObjectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), where: AchievementWhereUniqueInputObjectSchema, create: z.union([ AchievementCreateInputObjectSchema, AchievementUncheckedCreateInputObjectSchema ]), update: z.union([ AchievementUpdateInputObjectSchema, AchievementUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.AchievementUpsertArgs>;

export const AchievementUpsertOneZodSchema = z.object({ select: AchievementSelectObjectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), where: AchievementWhereUniqueInputObjectSchema, create: z.union([ AchievementCreateInputObjectSchema, AchievementUncheckedCreateInputObjectSchema ]), update: z.union([ AchievementUpdateInputObjectSchema, AchievementUncheckedUpdateInputObjectSchema ]) }).strict();