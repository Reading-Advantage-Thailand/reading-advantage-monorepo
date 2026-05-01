import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionUpdateManyMutationInputObjectSchema as QuizQuestionUpdateManyMutationInputObjectSchema } from './objects/QuizQuestionUpdateManyMutationInput.schema';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './objects/QuizQuestionWhereInput.schema';

export const QuizQuestionUpdateManySchema: z.ZodType<Prisma.QuizQuestionUpdateManyArgs> = z.object({ data: QuizQuestionUpdateManyMutationInputObjectSchema, where: QuizQuestionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.QuizQuestionUpdateManyArgs>;

export const QuizQuestionUpdateManyZodSchema = z.object({ data: QuizQuestionUpdateManyMutationInputObjectSchema, where: QuizQuestionWhereInputObjectSchema.optional() }).strict();