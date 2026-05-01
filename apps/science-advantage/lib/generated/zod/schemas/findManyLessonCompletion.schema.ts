import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionIncludeObjectSchema as LessonCompletionIncludeObjectSchema } from './objects/LessonCompletionInclude.schema';
import { LessonCompletionOrderByWithRelationInputObjectSchema as LessonCompletionOrderByWithRelationInputObjectSchema } from './objects/LessonCompletionOrderByWithRelationInput.schema';
import { LessonCompletionWhereInputObjectSchema as LessonCompletionWhereInputObjectSchema } from './objects/LessonCompletionWhereInput.schema';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './objects/LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionScalarFieldEnumSchema } from './enums/LessonCompletionScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const LessonCompletionFindManySelectSchema: z.ZodType<Prisma.LessonCompletionSelect> = z.object({
    id: z.boolean().optional(),
    studentId: z.boolean().optional(),
    lessonId: z.boolean().optional(),
    status: z.boolean().optional(),
    completedAt: z.boolean().optional(),
    attemptsCount: z.boolean().optional(),
    bestScore: z.boolean().optional(),
    bestScorePercentage: z.boolean().optional(),
    mostRecentScore: z.boolean().optional(),
    mostRecentScorePercentage: z.boolean().optional(),
    totalTimeSpentSeconds: z.boolean().optional(),
    lastAttemptAt: z.boolean().optional(),
    student: z.boolean().optional(),
    lesson: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.LessonCompletionSelect>;

export const LessonCompletionFindManySelectZodSchema = z.object({
    id: z.boolean().optional(),
    studentId: z.boolean().optional(),
    lessonId: z.boolean().optional(),
    status: z.boolean().optional(),
    completedAt: z.boolean().optional(),
    attemptsCount: z.boolean().optional(),
    bestScore: z.boolean().optional(),
    bestScorePercentage: z.boolean().optional(),
    mostRecentScore: z.boolean().optional(),
    mostRecentScorePercentage: z.boolean().optional(),
    totalTimeSpentSeconds: z.boolean().optional(),
    lastAttemptAt: z.boolean().optional(),
    student: z.boolean().optional(),
    lesson: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional()
  }).strict();

export const LessonCompletionFindManySchema: z.ZodType<Prisma.LessonCompletionFindManyArgs> = z.object({ select: LessonCompletionFindManySelectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), orderBy: z.union([LessonCompletionOrderByWithRelationInputObjectSchema, LessonCompletionOrderByWithRelationInputObjectSchema.array()]).optional(), where: LessonCompletionWhereInputObjectSchema.optional(), cursor: LessonCompletionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([LessonCompletionScalarFieldEnumSchema, LessonCompletionScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.LessonCompletionFindManyArgs>;

export const LessonCompletionFindManyZodSchema = z.object({ select: LessonCompletionFindManySelectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), orderBy: z.union([LessonCompletionOrderByWithRelationInputObjectSchema, LessonCompletionOrderByWithRelationInputObjectSchema.array()]).optional(), where: LessonCompletionWhereInputObjectSchema.optional(), cursor: LessonCompletionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([LessonCompletionScalarFieldEnumSchema, LessonCompletionScalarFieldEnumSchema.array()]).optional() }).strict();