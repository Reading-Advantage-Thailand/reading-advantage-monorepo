import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './objects/QuizQuestionSelect.schema';
import { QuizQuestionIncludeObjectSchema as QuizQuestionIncludeObjectSchema } from './objects/QuizQuestionInclude.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './objects/QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionCreateInputObjectSchema as QuizQuestionCreateInputObjectSchema } from './objects/QuizQuestionCreateInput.schema';
import { QuizQuestionUncheckedCreateInputObjectSchema as QuizQuestionUncheckedCreateInputObjectSchema } from './objects/QuizQuestionUncheckedCreateInput.schema';
import { QuizQuestionUpdateInputObjectSchema as QuizQuestionUpdateInputObjectSchema } from './objects/QuizQuestionUpdateInput.schema';
import { QuizQuestionUncheckedUpdateInputObjectSchema as QuizQuestionUncheckedUpdateInputObjectSchema } from './objects/QuizQuestionUncheckedUpdateInput.schema';

export const QuizQuestionUpsertOneSchema: z.ZodType<Prisma.QuizQuestionUpsertArgs> = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), where: QuizQuestionWhereUniqueInputObjectSchema, create: z.union([ QuizQuestionCreateInputObjectSchema, QuizQuestionUncheckedCreateInputObjectSchema ]), update: z.union([ QuizQuestionUpdateInputObjectSchema, QuizQuestionUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.QuizQuestionUpsertArgs>;

export const QuizQuestionUpsertOneZodSchema = z.object({ select: QuizQuestionSelectObjectSchema.optional(), include: QuizQuestionIncludeObjectSchema.optional(), where: QuizQuestionWhereUniqueInputObjectSchema, create: z.union([ QuizQuestionCreateInputObjectSchema, QuizQuestionUncheckedCreateInputObjectSchema ]), update: z.union([ QuizQuestionUpdateInputObjectSchema, QuizQuestionUncheckedUpdateInputObjectSchema ]) }).strict();