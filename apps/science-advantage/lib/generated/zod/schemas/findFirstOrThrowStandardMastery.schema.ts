import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasteryIncludeObjectSchema as StandardMasteryIncludeObjectSchema } from './objects/StandardMasteryInclude.schema';
import { StandardMasteryOrderByWithRelationInputObjectSchema as StandardMasteryOrderByWithRelationInputObjectSchema } from './objects/StandardMasteryOrderByWithRelationInput.schema';
import { StandardMasteryWhereInputObjectSchema as StandardMasteryWhereInputObjectSchema } from './objects/StandardMasteryWhereInput.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './objects/StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryScalarFieldEnumSchema } from './enums/StandardMasteryScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const StandardMasteryFindFirstOrThrowSelectSchema: z.ZodType<Prisma.StandardMasterySelect> = z.object({
    id: z.boolean().optional(),
    studentId: z.boolean().optional(),
    standardId: z.boolean().optional(),
    masteryLevel: z.boolean().optional(),
    evidenceCount: z.boolean().optional(),
    lastAssessedAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    student: z.boolean().optional(),
    standard: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.StandardMasterySelect>;

export const StandardMasteryFindFirstOrThrowSelectZodSchema = z.object({
    id: z.boolean().optional(),
    studentId: z.boolean().optional(),
    standardId: z.boolean().optional(),
    masteryLevel: z.boolean().optional(),
    evidenceCount: z.boolean().optional(),
    lastAssessedAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    student: z.boolean().optional(),
    standard: z.boolean().optional()
  }).strict();

export const StandardMasteryFindFirstOrThrowSchema: z.ZodType<Prisma.StandardMasteryFindFirstOrThrowArgs> = z.object({ select: StandardMasteryFindFirstOrThrowSelectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), orderBy: z.union([StandardMasteryOrderByWithRelationInputObjectSchema, StandardMasteryOrderByWithRelationInputObjectSchema.array()]).optional(), where: StandardMasteryWhereInputObjectSchema.optional(), cursor: StandardMasteryWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([StandardMasteryScalarFieldEnumSchema, StandardMasteryScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.StandardMasteryFindFirstOrThrowArgs>;

export const StandardMasteryFindFirstOrThrowZodSchema = z.object({ select: StandardMasteryFindFirstOrThrowSelectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), orderBy: z.union([StandardMasteryOrderByWithRelationInputObjectSchema, StandardMasteryOrderByWithRelationInputObjectSchema.array()]).optional(), where: StandardMasteryWhereInputObjectSchema.optional(), cursor: StandardMasteryWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([StandardMasteryScalarFieldEnumSchema, StandardMasteryScalarFieldEnumSchema.array()]).optional() }).strict();