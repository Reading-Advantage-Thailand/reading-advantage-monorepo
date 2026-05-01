import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonUpdateManyMutationInputObjectSchema as LessonUpdateManyMutationInputObjectSchema } from './objects/LessonUpdateManyMutationInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './objects/LessonWhereInput.schema';

export const LessonUpdateManySchema: z.ZodType<Prisma.LessonUpdateManyArgs> = z.object({ data: LessonUpdateManyMutationInputObjectSchema, where: LessonWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.LessonUpdateManyArgs>;

export const LessonUpdateManyZodSchema = z.object({ data: LessonUpdateManyMutationInputObjectSchema, where: LessonWhereInputObjectSchema.optional() }).strict();