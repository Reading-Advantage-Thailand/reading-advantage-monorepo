import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { LessonSelectObjectSchema as LessonSelectObjectSchema } from './objects/LessonSelect.schema';
import { LessonUpdateManyMutationInputObjectSchema as LessonUpdateManyMutationInputObjectSchema } from './objects/LessonUpdateManyMutationInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './objects/LessonWhereInput.schema';

export const LessonUpdateManyAndReturnSchema: z.ZodType<Prisma.LessonUpdateManyAndReturnArgs> = z.object({ select: LessonSelectObjectSchema.optional(), data: LessonUpdateManyMutationInputObjectSchema, where: LessonWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.LessonUpdateManyAndReturnArgs>;

export const LessonUpdateManyAndReturnZodSchema = z.object({ select: LessonSelectObjectSchema.optional(), data: LessonUpdateManyMutationInputObjectSchema, where: LessonWhereInputObjectSchema.optional() }).strict();