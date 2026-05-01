import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './objects/QuizQuestionSelect.schema';
import { QuizQuestionIncludeObjectSchema as QuizQuestionIncludeObjectSchema } from './objects/QuizQuestionInclude.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './objects/QuizQuestionWhereUniqueInput.schema';

export const QuizQuestionFindUniqueSchema: z.ZodType<Prisma.QuizQuestionFindUniqueArgs> = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), where: QuizQuestionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.QuizQuestionFindUniqueArgs>;

export const QuizQuestionFindUniqueZodSchema = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), where: QuizQuestionWhereUniqueInputObjectSchema }).strict();