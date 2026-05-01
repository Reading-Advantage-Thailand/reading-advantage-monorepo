import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './objects/QuizQuestionSelect.schema';
import { QuizQuestionIncludeObjectSchema as QuizQuestionIncludeObjectSchema } from './objects/QuizQuestionInclude.schema';
import { QuizQuestionCreateInputObjectSchema as QuizQuestionCreateInputObjectSchema } from './objects/QuizQuestionCreateInput.schema';
import { QuizQuestionUncheckedCreateInputObjectSchema as QuizQuestionUncheckedCreateInputObjectSchema } from './objects/QuizQuestionUncheckedCreateInput.schema';

export const QuizQuestionCreateOneSchema: z.ZodType<Prisma.QuizQuestionCreateArgs> = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), data: z.union([QuizQuestionCreateInputObjectSchema, QuizQuestionUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.QuizQuestionCreateArgs>;

export const QuizQuestionCreateOneZodSchema = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), data: z.union([QuizQuestionCreateInputObjectSchema, QuizQuestionUncheckedCreateInputObjectSchema]) }).strict();