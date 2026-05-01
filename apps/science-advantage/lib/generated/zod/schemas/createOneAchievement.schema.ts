import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementSelectObjectSchema as AchievementSelectObjectSchema } from './objects/AchievementSelect.schema';
import { AchievementIncludeObjectSchema as AchievementIncludeObjectSchema } from './objects/AchievementInclude.schema';
import { AchievementCreateInputObjectSchema as AchievementCreateInputObjectSchema } from './objects/AchievementCreateInput.schema';
import { AchievementUncheckedCreateInputObjectSchema as AchievementUncheckedCreateInputObjectSchema } from './objects/AchievementUncheckedCreateInput.schema';

export const AchievementCreateOneSchema: z.ZodType<Prisma.AchievementCreateArgs> = z.object({ select: AchievementSelectObjectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), data: z.union([AchievementCreateInputObjectSchema, AchievementUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.AchievementCreateArgs>;

export const AchievementCreateOneZodSchema = z.object({ select: AchievementSelectObjectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), data: z.union([AchievementCreateInputObjectSchema, AchievementUncheckedCreateInputObjectSchema]) }).strict();