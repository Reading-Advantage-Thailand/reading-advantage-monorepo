import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './objects/QuizQuestionSelect.schema';
import { QuizQuestionIncludeObjectSchema as QuizQuestionIncludeObjectSchema } from './objects/QuizQuestionInclude.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './objects/QuizQuestionWhereUniqueInput.schema';

export const QuizQuestionFindUniqueOrThrowSchema: z.ZodType<Prisma.QuizQuestionFindUniqueOrThrowArgs> = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), where: QuizQuestionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.QuizQuestionFindUniqueOrThrowArgs>;

export const QuizQuestionFindUniqueOrThrowZodSchema = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), where: QuizQuestionWhereUniqueInputObjectSchema }).strict();