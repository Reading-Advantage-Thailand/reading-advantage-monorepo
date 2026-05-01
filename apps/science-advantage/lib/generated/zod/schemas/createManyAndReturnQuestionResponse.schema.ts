import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { QuestionResponseSelectObjectSchema as QuestionResponseSelectObjectSchema } from './objects/QuestionResponseSelect.schema';
import { QuestionResponseCreateManyInputObjectSchema as QuestionResponseCreateManyInputObjectSchema } from './objects/QuestionResponseCreateManyInput.schema';

export const QuestionResponseCreateManyAndReturnSchema: z.ZodType<Prisma.QuestionResponseCreateManyAndReturnArgs> = z.object({ select: QuestionResponseSelectObjectSchema.optional(), data: z.union([ QuestionResponseCreateManyInputObjectSchema, z.array(QuestionResponseCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.QuestionResponseCreateManyAndReturnArgs>;

export const QuestionResponseCreateManyAndReturnZodSchema = z.object({ select: QuestionResponseSelectObjectSchema.optional(), data: z.union([ QuestionResponseCreateManyInputObjectSchema, z.array(QuestionResponseCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();