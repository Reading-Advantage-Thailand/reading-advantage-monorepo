import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCreateManyInputObjectSchema as LessonCreateManyInputObjectSchema } from './objects/LessonCreateManyInput.schema';

export const LessonCreateManySchema: z.ZodType<Prisma.LessonCreateManyArgs> = z.object({ data: z.union([ LessonCreateManyInputObjectSchema, z.array(LessonCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.LessonCreateManyArgs>;

export const LessonCreateManyZodSchema = z.object({ data: z.union([ LessonCreateManyInputObjectSchema, z.array(LessonCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();