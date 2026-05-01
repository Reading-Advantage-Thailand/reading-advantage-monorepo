import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementSelectObjectSchema as AchievementSelectObjectSchema } from './objects/AchievementSelect.schema';
import { AchievementUpdateManyMutationInputObjectSchema as AchievementUpdateManyMutationInputObjectSchema } from './objects/AchievementUpdateManyMutationInput.schema';
import { AchievementWhereInputObjectSchema as AchievementWhereInputObjectSchema } from './objects/AchievementWhereInput.schema';

export const AchievementUpdateManyAndReturnSchema: z.ZodType<Prisma.AchievementUpdateManyAndReturnArgs> = z.object({ select: AchievementSelectObjectSchema.optional(), data: AchievementUpdateManyMutationInputObjectSchema, where: AchievementWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.AchievementUpdateManyAndReturnArgs>;

export const AchievementUpdateManyAndReturnZodSchema = z.object({ select: AchievementSelectObjectSchema.optional(), data: AchievementUpdateManyMutationInputObjectSchema, where: AchievementWhereInputObjectSchema.optional() }).strict();