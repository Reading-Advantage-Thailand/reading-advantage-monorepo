import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonSelectObjectSchema as LessonSelectObjectSchema } from './objects/LessonSelect.schema';
import { LessonIncludeObjectSchema as LessonIncludeObjectSchema } from './objects/LessonInclude.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './objects/LessonWhereUniqueInput.schema';

export const LessonFindUniqueSchema: z.ZodType<Prisma.LessonFindUniqueArgs> = z.object({ select: LessonSelectObjectSchema.optional(), include: LessonIncludeObjectSchema.optional(), where: LessonWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.LessonFindUniqueArgs>;

export const LessonFindUniqueZodSchema = z.object({ select: LessonSelectObjectSchema.optional(), include: LessonIncludeObjectSchema.optional(), where: LessonWhereUniqueInputObjectSchema }).strict();