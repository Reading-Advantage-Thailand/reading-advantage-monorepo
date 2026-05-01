import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseSelectObjectSchema as QuestionResponseSelectObjectSchema } from './objects/QuestionResponseSelect.schema';
import { QuestionResponseIncludeObjectSchema as QuestionResponseIncludeObjectSchema } from './objects/QuestionResponseInclude.schema';
import { QuestionResponseCreateInputObjectSchema as QuestionResponseCreateInputObjectSchema } from './objects/QuestionResponseCreateInput.schema';
import { QuestionResponseUncheckedCreateInputObjectSchema as QuestionResponseUncheckedCreateInputObjectSchema } from './objects/QuestionResponseUncheckedCreateInput.schema';

export const QuestionResponseCreateOneSchema: z.ZodType<Prisma.QuestionResponseCreateArgs> = z.object({ select: QuestionResponseSelectObjectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), data: z.union([QuestionResponseCreateInputObjectSchema, QuestionResponseUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.QuestionResponseCreateArgs>;

export const QuestionResponseCreateOneZodSchema = z.object({ select: QuestionResponseSelectObjectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), data: z.union([QuestionResponseCreateInputObjectSchema, QuestionResponseUncheckedCreateInputObjectSchema]) }).strict();