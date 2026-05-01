import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementSelectObjectSchema as AchievementSelectObjectSchema } from './objects/AchievementSelect.schema';
import { AchievementIncludeObjectSchema as AchievementIncludeObjectSchema } from './objects/AchievementInclude.schema';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './objects/AchievementWhereUniqueInput.schema';

export const AchievementFindUniqueOrThrowSchema: z.ZodType<Prisma.AchievementFindUniqueOrThrowArgs> = z.object({ select: AchievementSelectObjectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), where: AchievementWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.AchievementFindUniqueOrThrowArgs>;

export const AchievementFindUniqueOrThrowZodSchema = z.object({ select: AchievementSelectObjectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), where: AchievementWhereUniqueInputObjectSchema }).strict();