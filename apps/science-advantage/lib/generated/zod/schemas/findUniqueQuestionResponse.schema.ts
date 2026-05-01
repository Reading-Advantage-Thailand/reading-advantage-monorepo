import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseSelectObjectSchema as QuestionResponseSelectObjectSchema } from './objects/QuestionResponseSelect.schema';
import { QuestionResponseIncludeObjectSchema as QuestionResponseIncludeObjectSchema } from './objects/QuestionResponseInclude.schema';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './objects/QuestionResponseWhereUniqueInput.schema';

export const QuestionResponseFindUniqueSchema: z.ZodType<Prisma.QuestionResponseFindUniqueArgs> = z.object({ select: QuestionResponseSelectObjectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), where: QuestionResponseWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.QuestionResponseFindUniqueArgs>;

export const QuestionResponseFindUniqueZodSchema = z.object({ select: QuestionResponseSelectObjectSchema.optional(), include: QuestionResponseIncludeObjectSchema.optional(), where: QuestionResponseWhereUniqueInputObjectSchema }).strict();