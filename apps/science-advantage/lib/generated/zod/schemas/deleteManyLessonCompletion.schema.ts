import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonCompletionWhereInputObjectSchema as LessonCompletionWhereInputObjectSchema } from './objects/LessonCompletionWhereInput.schema';

export const LessonCompletionDeleteManySchema: z.ZodType<Prisma.LessonCompletionDeleteManyArgs> = z.object({ where: LessonCompletionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.LessonCompletionDeleteManyArgs>;

export const LessonCompletionDeleteManyZodSchema = z.object({ where: LessonCompletionWhereInputObjectSchema.optional() }).strict();