import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionUpdateManyMutationInputObjectSchema as LessonCompletionUpdateManyMutationInputObjectSchema } from './objects/LessonCompletionUpdateManyMutationInput.schema';
import { LessonCompletionWhereInputObjectSchema as LessonCompletionWhereInputObjectSchema } from './objects/LessonCompletionWhereInput.schema';

export const LessonCompletionUpdateManySchema: z.ZodType<Prisma.LessonCompletionUpdateManyArgs> = z.object({ data: LessonCompletionUpdateManyMutationInputObjectSchema, where: LessonCompletionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.LessonCompletionUpdateManyArgs>;

export const LessonCompletionUpdateManyZodSchema = z.object({ data: LessonCompletionUpdateManyMutationInputObjectSchema, where: LessonCompletionWhereInputObjectSchema.optional() }).strict();