import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonSelectObjectSchema as LessonSelectObjectSchema } from './objects/LessonSelect.schema';
import { LessonIncludeObjectSchema as LessonIncludeObjectSchema } from './objects/LessonInclude.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './objects/LessonWhereUniqueInput.schema';
import { LessonCreateInputObjectSchema as LessonCreateInputObjectSchema } from './objects/LessonCreateInput.schema';
import { LessonUncheckedCreateInputObjectSchema as LessonUncheckedCreateInputObjectSchema } from './objects/LessonUncheckedCreateInput.schema';
import { LessonUpdateInputObjectSchema as LessonUpdateInputObjectSchema } from './objects/LessonUpdateInput.schema';
import { LessonUncheckedUpdateInputObjectSchema as LessonUncheckedUpdateInputObjectSchema } from './objects/LessonUncheckedUpdateInput.schema';

export const LessonUpsertOneSchema: z.ZodType<Prisma.LessonUpsertArgs> = z.object({ select: LessonSelectObjectSchema.optional(), include: LessonIncludeObjectSchema.optional(), where: LessonWhereUniqueInputObjectSchema, create: z.union([ LessonCreateInputObjectSchema, LessonUncheckedCreateInputObjectSchema ]), update: z.union([ LessonUpdateInputObjectSchema, LessonUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.LessonUpsertArgs>;

export const LessonUpsertOneZodSchema = z.object({ select: LessonSelectObjectSchema.optional(), include: LessonIncludeObjectSchema.optional(), where: LessonWhereUniqueInputObjectSchema, create: z.union([ LessonCreateInputObjectSchema, LessonUncheckedCreateInputObjectSchema ]), update: z.union([ LessonUpdateInputObjectSchema, LessonUncheckedUpdateInputObjectSchema ]) }).strict();