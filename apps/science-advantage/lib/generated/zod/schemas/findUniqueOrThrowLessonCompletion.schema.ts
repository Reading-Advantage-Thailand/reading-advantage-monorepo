import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionSelectObjectSchema as LessonCompletionSelectObjectSchema } from './objects/LessonCompletionSelect.schema';
import { LessonCompletionIncludeObjectSchema as LessonCompletionIncludeObjectSchema } from './objects/LessonCompletionInclude.schema';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './objects/LessonCompletionWhereUniqueInput.schema';

export const LessonCompletionFindUniqueOrThrowSchema: z.ZodType<Prisma.LessonCompletionFindUniqueOrThrowArgs> = z.object({ select: LessonCompletionSelectObjectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), where: LessonCompletionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.LessonCompletionFindUniqueOrThrowArgs>;

export const LessonCompletionFindUniqueOrThrowZodSchema = z.object({ select: LessonCompletionSelectObjectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), where: LessonCompletionWhereUniqueInputObjectSchema }).strict();