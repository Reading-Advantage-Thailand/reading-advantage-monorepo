import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './objects/QuizQuestionSelect.schema';
import { QuizQuestionCreateManyInputObjectSchema as QuizQuestionCreateManyInputObjectSchema } from './objects/QuizQuestionCreateManyInput.schema';

export const QuizQuestionCreateManyAndReturnSchema: z.ZodType<Prisma.QuizQuestionCreateManyAndReturnArgs> = z.object({ select: QuizQuestionSelectObjectSchema.optional(), data: z.union([ QuizQuestionCreateManyInputObjectSchema, z.array(QuizQuestionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.QuizQuestionCreateManyAndReturnArgs>;

export const QuizQuestionCreateManyAndReturnZodSchema = z.object({ select: QuizQuestionSelectObjectSchema.optional(), data: z.union([ QuizQuestionCreateManyInputObjectSchema, z.array(QuizQuestionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();