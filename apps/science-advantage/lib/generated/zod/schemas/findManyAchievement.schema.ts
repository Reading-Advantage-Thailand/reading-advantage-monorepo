import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AchievementIncludeObjectSchema as AchievementIncludeObjectSchema } from './objects/AchievementInclude.schema';
import { AchievementOrderByWithRelationInputObjectSchema as AchievementOrderByWithRelationInputObjectSchema } from './objects/AchievementOrderByWithRelationInput.schema';
import { AchievementWhereInputObjectSchema as AchievementWhereInputObjectSchema } from './objects/AchievementWhereInput.schema';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './objects/AchievementWhereUniqueInput.schema';
import { AchievementScalarFieldEnumSchema } from './enums/AchievementScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const AchievementFindManySelectSchema: z.ZodType<Prisma.AchievementSelect> = z.object({
    id: z.boolean().optional(),
    userId: z.boolean().optional(),
    badgeType: z.boolean().optional(),
    unlockedAt: z.boolean().optional(),
    user: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.AchievementSelect>;

export const AchievementFindManySelectZodSchema = z.object({
    id: z.boolean().optional(),
    userId: z.boolean().optional(),
    badgeType: z.boolean().optional(),
    unlockedAt: z.boolean().optional(),
    user: z.boolean().optional()
  }).strict();

export const AchievementFindManySchema: z.ZodType<Prisma.AchievementFindManyArgs> = z.object({ select: AchievementFindManySelectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), orderBy: z.union([AchievementOrderByWithRelationInputObjectSchema, AchievementOrderByWithRelationInputObjectSchema.array()]).optional(), where: AchievementWhereInputObjectSchema.optional(), cursor: AchievementWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([AchievementScalarFieldEnumSchema, AchievementScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.AchievementFindManyArgs>;

export const AchievementFindManyZodSchema = z.object({ select: AchievementFindManySelectSchema.optional(), include: AchievementIncludeObjectSchema.optional(), orderBy: z.union([AchievementOrderByWithRelationInputObjectSchema, AchievementOrderByWithRelationInputObjectSchema.array()]).optional(), where: AchievementWhereInputObjectSchema.optional(), cursor: AchievementWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([AchievementScalarFieldEnumSchema, AchievementScalarFieldEnumSchema.array()]).optional() }).strict();