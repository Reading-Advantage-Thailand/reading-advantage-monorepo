import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionSelectObjectSchema as LessonCompletionSelectObjectSchema } from './objects/LessonCompletionSelect.schema';
import { LessonCompletionCreateManyInputObjectSchema as LessonCompletionCreateManyInputObjectSchema } from './objects/LessonCompletionCreateManyInput.schema';

export const LessonCompletionCreateManyAndReturnSchema: z.ZodType<Prisma.LessonCompletionCreateManyAndReturnArgs> = z.object({ select: LessonCompletionSelectObjectSchema.optional(), data: z.union([ LessonCompletionCreateManyInputObjectSchema, z.array(LessonCompletionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.LessonCompletionCreateManyAndReturnArgs>;

export const LessonCompletionCreateManyAndReturnZodSchema = z.object({ select: LessonCompletionSelectObjectSchema.optional(), data: z.union([ LessonCompletionCreateManyInputObjectSchema, z.array(LessonCompletionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();