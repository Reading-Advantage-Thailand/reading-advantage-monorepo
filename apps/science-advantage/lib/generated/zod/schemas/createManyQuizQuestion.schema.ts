import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionCreateManyInputObjectSchema as QuizQuestionCreateManyInputObjectSchema } from './objects/QuizQuestionCreateManyInput.schema';

export const QuizQuestionCreateManySchema: z.ZodType<Prisma.QuizQuestionCreateManyArgs> = z.object({ data: z.union([ QuizQuestionCreateManyInputObjectSchema, z.array(QuizQuestionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.QuizQuestionCreateManyArgs>;

export const QuizQuestionCreateManyZodSchema = z.object({ data: z.union([ QuizQuestionCreateManyInputObjectSchema, z.array(QuizQuestionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();