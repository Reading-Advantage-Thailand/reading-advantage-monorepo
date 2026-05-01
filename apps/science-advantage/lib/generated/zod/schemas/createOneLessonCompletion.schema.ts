import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionSelectObjectSchema as LessonCompletionSelectObjectSchema } from './objects/LessonCompletionSelect.schema';
import { LessonCompletionIncludeObjectSchema as LessonCompletionIncludeObjectSchema } from './objects/LessonCompletionInclude.schema';
import { LessonCompletionCreateInputObjectSchema as LessonCompletionCreateInputObjectSchema } from './objects/LessonCompletionCreateInput.schema';
import { LessonCompletionUncheckedCreateInputObjectSchema as LessonCompletionUncheckedCreateInputObjectSchema } from './objects/LessonCompletionUncheckedCreateInput.schema';

export const LessonCompletionCreateOneSchema: z.ZodType<Prisma.LessonCompletionCreateArgs> = z.object({ select: LessonCompletionSelectObjectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), data: z.union([LessonCompletionCreateInputObjectSchema, LessonCompletionUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.LessonCompletionCreateArgs>;

export const LessonCompletionCreateOneZodSchema = z.object({ select: LessonCompletionSelectObjectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), data: z.union([LessonCompletionCreateInputObjectSchema, LessonCompletionUncheckedCreateInputObjectSchema]) }).strict();