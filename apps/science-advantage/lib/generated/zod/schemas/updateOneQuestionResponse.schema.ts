import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseSelectObjectSchema as QuestionResponseSelectObjectSchema } from './objects/QuestionResponseSelect.schema';
import { QuestionResponseIncludeObjectSchema as QuestionResponseIncludeObjectSchema } from './objects/QuestionResponseInclude.schema';
import { QuestionResponseUpdateInputObjectSchema as QuestionResponseUpdateInputObjectSchema } from './objects/QuestionResponseUpdateInput.schema';
import { QuestionResponseUncheckedUpdateInputObjectSchema as QuestionResponseUncheckedUpdateInputObjectSchema } from './objects/QuestionResponseUncheckedUpdateInput.schema';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './objects/QuestionResponseWhereUniqueInput.schema';

export const QuestionResponseUpdateOneSchema: z.ZodType<Prisma.QuestionResponseUpdateArgs> = z.object({ select: QuestionResponseSelectObjectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), data: z.union([QuestionResponseUpdateInputObjectSchema, QuestionResponseUncheckedUpdateInputObjectSchema]), where: QuestionResponseWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.QuestionResponseUpdateArgs>;

export const QuestionResponseUpdateOneZodSchema = z.object({ select: QuestionResponseSelectObjectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), data: z.union([QuestionResponseUpdateInputObjectSchema, QuestionResponseUncheckedUpdateInputObjectSchema]), where: QuestionResponseWhereUniqueInputObjectSchema }).strict();