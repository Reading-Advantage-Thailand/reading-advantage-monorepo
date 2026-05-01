import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileIncludeObjectSchema as GamificationProfileIncludeObjectSchema } from './objects/GamificationProfileInclude.schema';
import { GamificationProfileOrderByWithRelationInputObjectSchema as GamificationProfileOrderByWithRelationInputObjectSchema } from './objects/GamificationProfileOrderByWithRelationInput.schema';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './objects/GamificationProfileWhereInput.schema';
import { GamificationProfileWhereUniqueInputObjectSchema as GamificationProfileWhereUniqueInputObjectSchema } from './objects/GamificationProfileWhereUniqueInput.schema';
import { GamificationProfileScalarFieldEnumSchema } from './enums/GamificationProfileScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const GamificationProfileFindFirstSelectSchema: z.ZodType<Prisma.GamificationProfileSelect> = z.object({
    id: z.boolean().optional(),
    userId: z.boolean().optional(),
    xp: z.boolean().optional(),
    level: z.boolean().optional(),
    streak: z.boolean().optional(),
    lastActiveAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    user: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.GamificationProfileSelect>;

export const GamificationProfileFindFirstSelectZodSchema = z.object({
    id: z.boolean().optional(),
    userId: z.boolean().optional(),
    xp: z.boolean().optional(),
    level: z.boolean().optional(),
    streak: z.boolean().optional(),
    lastActiveAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    user: z.boolean().optional()
  }).strict();

export const GamificationProfileFindFirstSchema: z.ZodType<Prisma.GamificationProfileFindFirstArgs> = z.object({ select: GamificationProfileFindFirstSelectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), orderBy: z.union([GamificationProfileOrderByWithRelationInputObjectSchema, GamificationProfileOrderByWithRelationInputObjectSchema.array()]).optional(), where: GamificationProfileWhereInputObjectSchema.optional(), cursor: GamificationProfileWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([GamificationProfileScalarFieldEnumSchema, GamificationProfileScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.GamificationProfileFindFirstArgs>;

export const GamificationProfileFindFirstZodSchema = z.object({ select: GamificationProfileFindFirstSelectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), orderBy: z.union([GamificationProfileOrderByWithRelationInputObjectSchema, GamificationProfileOrderByWithRelationInputObjectSchema.array()]).optional(), where: GamificationProfileWhereInputObjectSchema.optional(), cursor: GamificationProfileWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([GamificationProfileScalarFieldEnumSchema, GamificationProfileScalarFieldEnumSchema.array()]).optional() }).strict();