import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './objects/QuizQuestionWhereInput.schema';

export const QuizQuestionDeleteManySchema: z.ZodType<Prisma.QuizQuestionDeleteManyArgs> = z.object({ where: QuizQuestionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.QuizQuestionDeleteManyArgs>;

export const QuizQuestionDeleteManyZodSchema = z.object({ where: QuizQuestionWhereInputObjectSchema.optional() }).strict();