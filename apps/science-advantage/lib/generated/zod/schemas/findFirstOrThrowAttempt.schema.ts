import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AttemptIncludeObjectSchema as AttemptIncludeObjectSchema } from './objects/AttemptInclude.schema';
import { AttemptOrderByWithRelationInputObjectSchema as AttemptOrderByWithRelationInputObjectSchema } from './objects/AttemptOrderByWithRelationInput.schema';
import { AttemptWhereInputObjectSchema as AttemptWhereInputObjectSchema } from './objects/AttemptWhereInput.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './objects/AttemptWhereUniqueInput.schema';
import { AttemptScalarFieldEnumSchema } from './enums/AttemptScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const AttemptFindFirstOrThrowSelectSchema: z.ZodType<Prisma.AttemptSelect> = z.object({
    id: z.boolean().optional(),
    studentId: z.boolean().optional(),
    lessonId: z.boolean().optional(),
    score: z.boolean().optional(),
    maxScore: z.boolean().optional(),
    attemptNumber: z.boolean().optional(),
    startedAt: z.boolean().optional(),
    completedAt: z.boolean().optional(),
    student: z.boolean().optional(),
    lesson: z.boolean().optional(),
    questionResponses: z.boolean().optional(),
    masteryRun: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.AttemptSelect>;

export const AttemptFindFirstOrThrowSelectZodSchema = z.object({
    id: z.boolean().optional(),
    studentId: z.boolean().optional(),
    lessonId: z.boolean().optional(),
    score: z.boolean().optional(),
    maxScore: z.boolean().optional(),
    attemptNumber: z.boolean().optional(),
    startedAt: z.boolean().optional(),
    completedAt: z.boolean().optional(),
    student: z.boolean().optional(),
    lesson: z.boolean().optional(),
    questionResponses: z.boolean().optional(),
    masteryRun: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict();

export const AttemptFindFirstOrThrowSchema: z.ZodType<Prisma.AttemptFindFirstOrThrowArgs> = z.object({ select: AttemptFindFirstOrThrowSelectSchema.optional(), include: AttemptIncludeObjectSchema.optional(), orderBy: z.union([AttemptOrderByWithRelationInputObjectSchema, AttemptOrderByWithRelationInputObjectSchema.array()]).optional(), where: AttemptWhereInputObjectSchema.optional(), cursor: AttemptWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([AttemptScalarFieldEnumSchema, AttemptScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.AttemptFindFirstOrThrowArgs>;

export const AttemptFindFirstOrThrowZodSchema = z.object({ select: AttemptFindFirstOrThrowSelectSchema.optional(), include: AttemptIncludeObjectSchema.optional(), orderBy: z.union([AttemptOrderByWithRelationInputObjectSchema, AttemptOrderByWithRelationInputObjectSchema.array()]).optional(), where: AttemptWhereInputObjectSchema.optional(), cursor: AttemptWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([AttemptScalarFieldEnumSchema, AttemptScalarFieldEnumSchema.array()]).optional() }).strict();