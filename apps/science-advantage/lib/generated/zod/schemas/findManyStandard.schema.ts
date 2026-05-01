import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardIncludeObjectSchema as StandardIncludeObjectSchema } from './objects/StandardInclude.schema';
import { StandardOrderByWithRelationInputObjectSchema as StandardOrderByWithRelationInputObjectSchema } from './objects/StandardOrderByWithRelationInput.schema';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './objects/StandardWhereInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './objects/StandardWhereUniqueInput.schema';
import { StandardScalarFieldEnumSchema } from './enums/StandardScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const StandardFindManySelectSchema: z.ZodType<Prisma.StandardSelect> = z.object({
    id: z.boolean().optional(),
    framework: z.boolean().optional(),
    code: z.boolean().optional(),
    description: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    lessons: z.boolean().optional(),
    quizQuestions: z.boolean().optional(),
    masteryRecords: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.StandardSelect>;

export const StandardFindManySelectZodSchema = z.object({
    id: z.boolean().optional(),
    framework: z.boolean().optional(),
    code: z.boolean().optional(),
    description: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    lessons: z.boolean().optional(),
    quizQuestions: z.boolean().optional(),
    masteryRecords: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict();

export const StandardFindManySchema: z.ZodType<Prisma.StandardFindManyArgs> = z.object({ select: StandardFindManySelectSchema.optional(), include: StandardIncludeObjectSchema.optional(), orderBy: z.union([StandardOrderByWithRelationInputObjectSchema, StandardOrderByWithRelationInputObjectSchema.array()]).optional(), where: StandardWhereInputObjectSchema.optional(), cursor: StandardWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([StandardScalarFieldEnumSchema, StandardScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.StandardFindManyArgs>;

export const StandardFindManyZodSchema = z.object({ select: StandardFindManySelectSchema.optional(), include: StandardIncludeObjectSchema.optional(), orderBy: z.union([StandardOrderByWithRelationInputObjectSchema, StandardOrderByWithRelationInputObjectSchema.array()]).optional(), where: StandardWhereInputObjectSchema.optional(), cursor: StandardWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([StandardScalarFieldEnumSchema, StandardScalarFieldEnumSchema.array()]).optional() }).strict();