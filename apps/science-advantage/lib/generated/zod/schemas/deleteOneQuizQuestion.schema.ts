import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './objects/QuizQuestionSelect.schema';
import { QuizQuestionIncludeObjectSchema as QuizQuestionIncludeObjectSchema } from './objects/QuizQuestionInclude.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './objects/QuizQuestionWhereUniqueInput.schema';

export const QuizQuestionDeleteOneSchema: z.ZodType<Prisma.QuizQuestionDeleteArgs> = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), where: QuizQuestionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.QuizQuestionDeleteArgs>;

export const QuizQuestionDeleteOneZodSchema = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), where: QuizQuestionWhereUniqueInputObjectSchema }).strict();