import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionSelectObjectSchema as LessonCompletionSelectObjectSchema } from './objects/LessonCompletionSelect.schema';
import { LessonCompletionIncludeObjectSchema as LessonCompletionIncludeObjectSchema } from './objects/LessonCompletionInclude.schema';
import { LessonCompletionUpdateInputObjectSchema as LessonCompletionUpdateInputObjectSchema } from './objects/LessonCompletionUpdateInput.schema';
import { LessonCompletionUncheckedUpdateInputObjectSchema as LessonCompletionUncheckedUpdateInputObjectSchema } from './objects/LessonCompletionUncheckedUpdateInput.schema';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './objects/LessonCompletionWhereUniqueInput.schema';

export const LessonCompletionUpdateOneSchema: z.ZodType<Prisma.LessonCompletionUpdateArgs> = z.object({ select: LessonCompletionSelectObjectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), data: z.union([LessonCompletionUpdateInputObjectSchema, LessonCompletionUncheckedUpdateInputObjectSchema]), where: LessonCompletionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.LessonCompletionUpdateArgs>;

export const LessonCompletionUpdateOneZodSchema = z.object({ select: LessonCompletionSelectObjectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), data: z.union([LessonCompletionUpdateInputObjectSchema, LessonCompletionUncheckedUpdateInputObjectSchema]), where: LessonCompletionWhereUniqueInputObjectSchema }).strict();