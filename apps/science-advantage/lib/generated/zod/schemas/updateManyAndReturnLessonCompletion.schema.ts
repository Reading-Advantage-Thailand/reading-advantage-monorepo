import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionSelectObjectSchema as LessonCompletionSelectObjectSchema } from './objects/LessonCompletionSelect.schema';
import { LessonCompletionUpdateManyMutationInputObjectSchema as LessonCompletionUpdateManyMutationInputObjectSchema } from './objects/LessonCompletionUpdateManyMutationInput.schema';
import { LessonCompletionWhereInputObjectSchema as LessonCompletionWhereInputObjectSchema } from './objects/LessonCompletionWhereInput.schema';

export const LessonCompletionUpdateManyAndReturnSchema: z.ZodType<Prisma.LessonCompletionUpdateManyAndReturnArgs> = z.object({ select: LessonCompletionSelectObjectSchema.optional(), data: LessonCompletionUpdateManyMutationInputObjectSchema, where: LessonCompletionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.LessonCompletionUpdateManyAndReturnArgs>;

export const LessonCompletionUpdateManyAndReturnZodSchema = z.object({ select: LessonCompletionSelectObjectSchema.optional(), data: LessonCompletionUpdateManyMutationInputObjectSchema, where: LessonCompletionWhereInputObjectSchema.optional() }).strict();