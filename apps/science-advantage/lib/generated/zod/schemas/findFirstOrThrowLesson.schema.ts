import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonIncludeObjectSchema as LessonIncludeObjectSchema } from './objects/LessonInclude.schema';
import { LessonOrderByWithRelationInputObjectSchema as LessonOrderByWithRelationInputObjectSchema } from './objects/LessonOrderByWithRelationInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './objects/LessonWhereInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './objects/LessonWhereUniqueInput.schema';
import { LessonScalarFieldEnumSchema } from './enums/LessonScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const LessonFindFirstOrThrowSelectSchema: z.ZodType<Prisma.LessonSelect> = z.object({
    id: z.boolean().optional(),
    slug: z.boolean().optional(),
    title: z.boolean().optional(),
    titleThai: z.boolean().optional(),
    description: z.boolean().optional(),
    descriptionThai: z.boolean().optional(),
    content: z.boolean().optional(),
    structuredContent: z.boolean().optional(),
    lessonType: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    order: z.boolean().optional(),
    standards: z.boolean().optional(),
    curriculumUnits: z.boolean().optional(),
    quizQuestions: z.boolean().optional(),
    attempts: z.boolean().optional(),
    lessonCompletions: z.boolean().optional(),
    assignments: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.LessonSelect>;

export const LessonFindFirstOrThrowSelectZodSchema = z.object({
    id: z.boolean().optional(),
    slug: z.boolean().optional(),
    title: z.boolean().optional(),
    titleThai: z.boolean().optional(),
    description: z.boolean().optional(),
    descriptionThai: z.boolean().optional(),
    content: z.boolean().optional(),
    structuredContent: z.boolean().optional(),
    lessonType: z.boolean().optional(),
    gradeLevel: z.boolean().optional(),
    order: z.boolean().optional(),
    standards: z.boolean().optional(),
    curriculumUnits: z.boolean().optional(),
    quizQuestions: z.boolean().optional(),
    attempts: z.boolean().optional(),
    lessonCompletions: z.boolean().optional(),
    assignments: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict();

export const LessonFindFirstOrThrowSchema: z.ZodType<Prisma.LessonFindFirstOrThrowArgs> = z.object({ select: LessonFindFirstOrThrowSelectSchema.optional(), include: LessonIncludeObjectSchema.optional(), orderBy: z.union([LessonOrderByWithRelationInputObjectSchema, LessonOrderByWithRelationInputObjectSchema.array()]).optional(), where: LessonWhereInputObjectSchema.optional(), cursor: LessonWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([LessonScalarFieldEnumSchema, LessonScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.LessonFindFirstOrThrowArgs>;

export const LessonFindFirstOrThrowZodSchema = z.object({ select: LessonFindFirstOrThrowSelectSchema.optional(), include: LessonIncludeObjectSchema.optional(), orderBy: z.union([LessonOrderByWithRelationInputObjectSchema, LessonOrderByWithRelationInputObjectSchema.array()]).optional(), where: LessonWhereInputObjectSchema.optional(), cursor: LessonWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([LessonScalarFieldEnumSchema, LessonScalarFieldEnumSchema.array()]).optional() }).strict();