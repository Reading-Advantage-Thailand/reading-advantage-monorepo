import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './objects/QuizQuestionSelect.schema';
import { QuizQuestionUpdateManyMutationInputObjectSchema as QuizQuestionUpdateManyMutationInputObjectSchema } from './objects/QuizQuestionUpdateManyMutationInput.schema';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './objects/QuizQuestionWhereInput.schema';

export const QuizQuestionUpdateManyAndReturnSchema: z.ZodType<Prisma.QuizQuestionUpdateManyAndReturnArgs> = z.object({ select: QuizQuestionSelectObjectSchema.optional(), data: QuizQuestionUpdateManyMutationInputObjectSchema, where: QuizQuestionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.QuizQuestionUpdateManyAndReturnArgs>;

export const QuizQuestionUpdateManyAndReturnZodSchema = z.object({ select: QuizQuestionSelectObjectSchema.optional(), data: QuizQuestionUpdateManyMutationInputObjectSchema, where: QuizQuestionWhereInputObjectSchema.optional() }).strict();