import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './objects/QuizQuestionSelect.schema';
import { QuizQuestionIncludeObjectSchema as QuizQuestionIncludeObjectSchema } from './objects/QuizQuestionInclude.schema';
import { QuizQuestionUpdateInputObjectSchema as QuizQuestionUpdateInputObjectSchema } from './objects/QuizQuestionUpdateInput.schema';
import { QuizQuestionUncheckedUpdateInputObjectSchema as QuizQuestionUncheckedUpdateInputObjectSchema } from './objects/QuizQuestionUncheckedUpdateInput.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './objects/QuizQuestionWhereUniqueInput.schema';

export const QuizQuestionUpdateOneSchema: z.ZodType<Prisma.QuizQuestionUpdateArgs> = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), data: z.union([QuizQuestionUpdateInputObjectSchema, QuizQuestionUncheckedUpdateInputObjectSchema]), where: QuizQuestionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.QuizQuestionUpdateArgs>;

export const QuizQuestionUpdateOneZodSchema = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), data: z.union([QuizQuestionUpdateInputObjectSchema, QuizQuestionUncheckedUpdateInputObjectSchema]), where: QuizQuestionWhereUniqueInputObjectSchema }).strict();