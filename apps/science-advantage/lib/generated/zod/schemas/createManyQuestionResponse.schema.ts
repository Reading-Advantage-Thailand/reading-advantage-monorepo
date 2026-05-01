import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseCreateManyInputObjectSchema as QuestionResponseCreateManyInputObjectSchema } from './objects/QuestionResponseCreateManyInput.schema';

export const QuestionResponseCreateManySchema: z.ZodType<Prisma.QuestionResponseCreateManyArgs> = z.object({ data: z.union([ QuestionResponseCreateManyInputObjectSchema, z.array(QuestionResponseCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.QuestionResponseCreateManyArgs>;

export const QuestionResponseCreateManyZodSchema = z.object({ data: z.union([ QuestionResponseCreateManyInputObjectSchema, z.array(QuestionResponseCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();