import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseIncludeObjectSchema as QuestionResponseIncludeObjectSchema } from './objects/QuestionResponseInclude.schema';
import { QuestionResponseOrderByWithRelationInputObjectSchema as QuestionResponseOrderByWithRelationInputObjectSchema } from './objects/QuestionResponseOrderByWithRelationInput.schema';
import { QuestionResponseWhereInputObjectSchema as QuestionResponseWhereInputObjectSchema } from './objects/QuestionResponseWhereInput.schema';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './objects/QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseScalarFieldEnumSchema } from './enums/QuestionResponseScalarFieldEnum.schema';

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const QuestionResponseFindManySelectSchema: z.ZodType<Prisma.QuestionResponseSelect> = z.object({
    id: z.boolean().optional(),
    attemptId: z.boolean().optional(),
    questionId: z.boolean().optional(),
    studentAnswer: z.boolean().optional(),
    isCorrect: z.boolean().optional(),
    timeSpentSeconds: z.boolean().optional(),
    answeredAt: z.boolean().optional(),
    order: z.boolean().optional(),
    attempt: z.boolean().optional(),
    question: z.boolean().optional(),
    createdAt: z.boolean().optional()
  }).strict() as unknown as z.ZodType<Prisma.QuestionResponseSelect>;

export const QuestionResponseFindManySelectZodSchema = z.object({
    id: z.boolean().optional(),
    attemptId: z.boolean().optional(),
    questionId: z.boolean().optional(),
    studentAnswer: z.boolean().optional(),
    isCorrect: z.boolean().optional(),
    timeSpentSeconds: z.boolean().optional(),
    answeredAt: z.boolean().optional(),
    order: z.boolean().optional(),
    attempt: z.boolean().optional(),
    question: z.boolean().optional(),
    createdAt: z.boolean().optional()
  }).strict();

export const QuestionResponseFindManySchema: z.ZodType<Prisma.QuestionResponseFindManyArgs> = z.object({ select: QuestionResponseFindManySelectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), orderBy: z.union([QuestionResponseOrderByWithRelationInputObjectSchema, QuestionResponseOrderByWithRelationInputObjectSchema.array()]).optional(), where: QuestionResponseWhereInputObjectSchema.optional(), cursor: QuestionResponseWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([QuestionResponseScalarFieldEnumSchema, QuestionResponseScalarFieldEnumSchema.array()]).optional() }).strict() as unknown as z.ZodType<Prisma.QuestionResponseFindManyArgs>;

export const QuestionResponseFindManyZodSchema = z.object({ select: QuestionResponseFindManySelectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), orderBy: z.union([QuestionResponseOrderByWithRelationInputObjectSchema, QuestionResponseOrderByWithRelationInputObjectSchema.array()]).optional(), where: QuestionResponseWhereInputObjectSchema.optional(), cursor: QuestionResponseWhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([QuestionResponseScalarFieldEnumSchema, QuestionResponseScalarFieldEnumSchema.array()]).optional() }).strict();