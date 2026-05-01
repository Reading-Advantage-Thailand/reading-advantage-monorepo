import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseSelectObjectSchema as QuestionResponseSelectObjectSchema } from './objects/QuestionResponseSelect.schema';
import { QuestionResponseIncludeObjectSchema as QuestionResponseIncludeObjectSchema } from './objects/QuestionResponseInclude.schema';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './objects/QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseCreateInputObjectSchema as QuestionResponseCreateInputObjectSchema } from './objects/QuestionResponseCreateInput.schema';
import { QuestionResponseUncheckedCreateInputObjectSchema as QuestionResponseUncheckedCreateInputObjectSchema } from './objects/QuestionResponseUncheckedCreateInput.schema';
import { QuestionResponseUpdateInputObjectSchema as QuestionResponseUpdateInputObjectSchema } from './objects/QuestionResponseUpdateInput.schema';
import { QuestionResponseUncheckedUpdateInputObjectSchema as QuestionResponseUncheckedUpdateInputObjectSchema } from './objects/QuestionResponseUncheckedUpdateInput.schema';

export const QuestionResponseUpsertOneSchema: z.ZodType<Prisma.QuestionResponseUpsertArgs> = z.object({ select: QuestionResponseSelectObjectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), where: QuestionResponseWhereUniqueInputObjectSchema, create: z.union([ QuestionResponseCreateInputObjectSchema, QuestionResponseUncheckedCreateInputObjectSchema ]), update: z.union([ QuestionResponseUpdateInputObjectSchema, QuestionResponseUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.QuestionResponseUpsertArgs>;

export const QuestionResponseUpsertOneZodSchema = z.object({ select: QuestionResponseSelectObjectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), where: QuestionResponseWhereUniqueInputObjectSchema, create: z.union([ QuestionResponseCreateInputObjectSchema, QuestionResponseUncheckedCreateInputObjectSchema ]), update: z.union([ QuestionResponseUpdateInputObjectSchema, QuestionResponseUncheckedUpdateInputObjectSchema ]) }).strict();