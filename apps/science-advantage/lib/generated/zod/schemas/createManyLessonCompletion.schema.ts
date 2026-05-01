import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionCreateManyInputObjectSchema as LessonCompletionCreateManyInputObjectSchema } from './objects/LessonCompletionCreateManyInput.schema';

export const LessonCompletionCreateManySchema: z.ZodType<Prisma.LessonCompletionCreateManyArgs> = z.object({ data: z.union([ LessonCompletionCreateManyInputObjectSchema, z.array(LessonCompletionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.LessonCompletionCreateManyArgs>;

export const LessonCompletionCreateManyZodSchema = z.object({ data: z.union([ LessonCompletionCreateManyInputObjectSchema, z.array(LessonCompletionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();