import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementUpdateManyMutationInputObjectSchema as AchievementUpdateManyMutationInputObjectSchema } from './objects/AchievementUpdateManyMutationInput.schema';
import { AchievementWhereInputObjectSchema as AchievementWhereInputObjectSchema } from './objects/AchievementWhereInput.schema';

export const AchievementUpdateManySchema: z.ZodType<Prisma.AchievementUpdateManyArgs> = z.object({ data: AchievementUpdateManyMutationInputObjectSchema, where: AchievementWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.AchievementUpdateManyArgs>;

export const AchievementUpdateManyZodSchema = z.object({ data: AchievementUpdateManyMutationInputObjectSchema, where: AchievementWhereInputObjectSchema.optional() }).strict();