import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonSelectObjectSchema as LessonSelectObjectSchema } from './objects/LessonSelect.schema';
import { LessonIncludeObjectSchema as LessonIncludeObjectSchema } from './objects/LessonInclude.schema';
import { LessonUpdateInputObjectSchema as LessonUpdateInputObjectSchema } from './objects/LessonUpdateInput.schema';
import { LessonUncheckedUpdateInputObjectSchema as LessonUncheckedUpdateInputObjectSchema } from './objects/LessonUncheckedUpdateInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './objects/LessonWhereUniqueInput.schema';

export const LessonUpdateOneSchema: z.ZodType<Prisma.LessonUpdateArgs> = z.object({ select: LessonSelectObjectSchema.optional(), include: LessonIncludeObjectSchema.optional(), data: z.union([LessonUpdateInputObjectSchema, LessonUncheckedUpdateInputObjectSchema]), where: LessonWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.LessonUpdateArgs>;

export const LessonUpdateOneZodSchema = z.object({ select: LessonSelectObjectSchema.optional(), include: LessonIncludeObjectSchema.optional(), data: z.union([LessonUpdateInputObjectSchema, LessonUncheckedUpdateInputObjectSchema]), where: LessonWhereUniqueInputObjectSchema }).strict();