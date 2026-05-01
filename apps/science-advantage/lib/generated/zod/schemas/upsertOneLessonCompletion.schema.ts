import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionSelectObjectSchema as LessonCompletionSelectObjectSchema } from './objects/LessonCompletionSelect.schema';
import { LessonCompletionIncludeObjectSchema as LessonCompletionIncludeObjectSchema } from './objects/LessonCompletionInclude.schema';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './objects/LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionCreateInputObjectSchema as LessonCompletionCreateInputObjectSchema } from './objects/LessonCompletionCreateInput.schema';
import { LessonCompletionUncheckedCreateInputObjectSchema as LessonCompletionUncheckedCreateInputObjectSchema } from './objects/LessonCompletionUncheckedCreateInput.schema';
import { LessonCompletionUpdateInputObjectSchema as LessonCompletionUpdateInputObjectSchema } from './objects/LessonCompletionUpdateInput.schema';
import { LessonCompletionUncheckedUpdateInputObjectSchema as LessonCompletionUncheckedUpdateInputObjectSchema } from './objects/LessonCompletionUncheckedUpdateInput.schema';

export const LessonCompletionUpsertOneSchema: z.ZodType<Prisma.LessonCompletionUpsertArgs> = z.object({ select: LessonCompletionSelectObjectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), where: LessonCompletionWhereUniqueInputObjectSchema, create: z.union([ LessonCompletionCreateInputObjectSchema, LessonCompletionUncheckedCreateInputObjectSchema ]), update: z.union([ LessonCompletionUpdateInputObjectSchema, LessonCompletionUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.LessonCompletionUpsertArgs>;

export const LessonCompletionUpsertOneZodSchema = z.object({ select: LessonCompletionSelectObjectSchema.optional(), include: LessonCompletionIncludeObjectSchema.optional(), where: LessonCompletionWhereUniqueInputObjectSchema, create: z.union([ LessonCompletionCreateInputObjectSchema, LessonCompletionUncheckedCreateInputObjectSchema ]), update: z.union([ LessonCompletionUpdateInputObjectSchema, LessonCompletionUncheckedUpdateInputObjectSchema ]) }).strict();