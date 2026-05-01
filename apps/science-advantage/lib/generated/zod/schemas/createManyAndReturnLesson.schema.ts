import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonSelectObjectSchema as LessonSelectObjectSchema } from './objects/LessonSelect.schema';
import { LessonCreateManyInputObjectSchema as LessonCreateManyInputObjectSchema } from './objects/LessonCreateManyInput.schema';

export const LessonCreateManyAndReturnSchema: z.ZodType<Prisma.LessonCreateManyAndReturnArgs> = z.object({ select: LessonSelectObjectSchema.optional(), data: z.union([ LessonCreateManyInputObjectSchema, z.array(LessonCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.LessonCreateManyAndReturnArgs>;

export const LessonCreateManyAndReturnZodSchema = z.object({ select: LessonSelectObjectSchema.optional(), data: z.union([ LessonCreateManyInputObjectSchema, z.array(LessonCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();