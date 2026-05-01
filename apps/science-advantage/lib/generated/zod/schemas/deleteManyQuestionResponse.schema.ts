import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseWhereInputObjectSchema as QuestionResponseWhereInputObjectSchema } from './objects/QuestionResponseWhereInput.schema';

export const QuestionResponseDeleteManySchema: z.ZodType<Prisma.QuestionResponseDeleteManyArgs> = z.object({ where: QuestionResponseWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.QuestionResponseDeleteManyArgs>;

export const QuestionResponseDeleteManyZodSchema = z.object({ where: QuestionResponseWhereInputObjectSchema.optional() }).strict();