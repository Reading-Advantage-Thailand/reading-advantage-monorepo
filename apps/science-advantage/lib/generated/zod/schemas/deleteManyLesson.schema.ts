import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './objects/LessonWhereInput.schema';

export const LessonDeleteManySchema: z.ZodType<Prisma.LessonDeleteManyArgs> = z.object({ where: LessonWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.LessonDeleteManyArgs>;

export const LessonDeleteManyZodSchema = z.object({ where: LessonWhereInputObjectSchema.optional() }).strict();