import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonSelectObjectSchema as LessonSelectObjectSchema } from './objects/LessonSelect.schema';
import { LessonIncludeObjectSchema as LessonIncludeObjectSchema } from './objects/LessonInclude.schema';
import { LessonCreateInputObjectSchema as LessonCreateInputObjectSchema } from './objects/LessonCreateInput.schema';
import { LessonUncheckedCreateInputObjectSchema as LessonUncheckedCreateInputObjectSchema } from './objects/LessonUncheckedCreateInput.schema';

export const LessonCreateOneSchema: z.ZodType<Prisma.LessonCreateArgs> = z.object({ select: LessonSelectObjectSchema.optional(), include: LessonIncludeObjectSchema.optional(), data: z.union([LessonCreateInputObjectSchema, LessonUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.LessonCreateArgs>;

export const LessonCreateOneZodSchema = z.object({ select: LessonSelectObjectSchema.optional(), include: LessonIncludeObjectSchema.optional(), data: z.union([LessonCreateInputObjectSchema, LessonUncheckedCreateInputObjectSchema]) }).strict();