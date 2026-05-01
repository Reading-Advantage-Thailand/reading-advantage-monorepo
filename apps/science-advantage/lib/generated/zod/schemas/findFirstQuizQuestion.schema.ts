import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionIncludeObjectSchema as QuizQuestionIncludeObjectSchema } from './objects/QuizQuestionInclude.schema';
import { QuizQuestionOrderByWithRelationInputObjectSchema as QuizQuestionOrderByWithRelationInputObjectSchema } from './objects/QuizQuestionOrderByWithRelationInput.schema';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './objects/QuizQuestionWhereInput.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './objects/QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionScalarFieldEnumSchema } from './enums/QuizQuestionScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const QuizQuestionFindFirstSelectSchema: z.ZodType<Prisma.QuizQuestionSelect> = z.object({
    id: z.boolean().optional(),
    slug: z.boolean().optional(),
    lessonId: z.boolean().optional(),
    type: z.boolean().optional(),
    text: z.boolean().optional(),
    options: z.boolean().optional(),
    correctAnswer: z.boolean().optional(),
    points: z.boolean().optional(),
    order: z.boolean().optional(),
    version: z.boolean().optional(),
    lesson: z.boolean().optional(),
    standards: z.boolean().optional(),
    responses: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.QuizQuestionSelect>;

export const QuizQuestionFindFirstSelectZodSchema = z.object({
    id: z.boolean().optional(),
    slug: z.boolean().optional(),
    lessonId: z.boolean().optional(),
    type: z.boolean().optional(),
    text: z.boolean().optional(),
    options: z.boolean().optional(),
    correctAnswer: z.boolean().optional(),
    points: z.boolean().optional(),
    order: z.boolean().optional(),
    version: z.boolean().optional(),
    lesson: z.boolean().optional(),
    standards: z.boolean().optional(),
    responses: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    _count: z.boolean().optional()
  }).strict();

export const QuizQuestionFindFirstSchema: z.ZodType<Prisma.QuizQuestionFindFirstArgs> = z.object({ select: QuizQuestionFindFirstSelectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), orderBy: z.union([QuizQuestionOrderByWithRelationInputObjectSchema, QuizQuestionOrderByWithRelationInputObjectSchema.array()]).optional(), where: QuizQuestionWhereInputObjectSchema.optional(), cursor: QuizQuestionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([QuizQuestionScalarFieldEnumSchema, QuizQuestionScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.QuizQuestionFindFirstArgs>;

export const QuizQuestionFindFirstZodSchema = z.object({ select: QuizQuestionFindFirstSelectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), orderBy: z.union([QuizQuestionOrderByWithRelationInputObjectSchema, QuizQuestionOrderByWithRelationInputObjectSchema.array()]).optional(), where: QuizQuestionWhereInputObjectSchema.optional(), cursor: QuizQuestionWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([QuizQuestionScalarFieldEnumSchema, QuizQuestionScalarFieldEnumSchema.array()]).optional() }).strict();