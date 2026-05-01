import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseSelectObjectSchema as QuestionResponseSelectObjectSchema } from './objects/QuestionResponseSelect.schema';
import { QuestionResponseUpdateManyMutationInputObjectSchema as QuestionResponseUpdateManyMutationInputObjectSchema } from './objects/QuestionResponseUpdateManyMutationInput.schema';
import { QuestionResponseWhereInputObjectSchema as QuestionResponseWhereInputObjectSchema } from './objects/QuestionResponseWhereInput.schema';

export const QuestionResponseUpdateManyAndReturnSchema: z.ZodType<Prisma.QuestionResponseUpdateManyAndReturnArgs> = z.object({ select: QuestionResponseSelectObjectSchema.optional(), data: QuestionResponseUpdateManyMutationInputObjectSchema, where: QuestionResponseWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.QuestionResponseUpdateManyAndReturnArgs>;

export const QuestionResponseUpdateManyAndReturnZodSchema = z.object({ select: QuestionResponseSelectObjectSchema.optional(), data: QuestionResponseUpdateManyMutationInputObjectSchema, where: QuestionResponseWhereInputObjectSchema.optional() }).strict();