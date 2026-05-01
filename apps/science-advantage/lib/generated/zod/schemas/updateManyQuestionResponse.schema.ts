import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseUpdateManyMutationInputObjectSchema as QuestionResponseUpdateManyMutationInputObjectSchema } from './objects/QuestionResponseUpdateManyMutationInput.schema';
import { QuestionResponseWhereInputObjectSchema as QuestionResponseWhereInputObjectSchema } from './objects/QuestionResponseWhereInput.schema';

export const QuestionResponseUpdateManySchema: z.ZodType<Prisma.QuestionResponseUpdateManyArgs> = z.object({ data: QuestionResponseUpdateManyMutationInputObjectSchema, where: QuestionResponseWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.QuestionResponseUpdateManyArgs>;

export const QuestionResponseUpdateManyZodSchema = z.object({ data: QuestionResponseUpdateManyMutationInputObjectSchema, where: QuestionResponseWhereInputObjectSchema.optional() }).strict();