import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonTypeSchema } from '../enums/LessonType.schema'

const makeSchema = () => z.object({
  set: LessonTypeSchema.optional()
}).strict();
export const EnumLessonTypeFieldUpdateOperationsInputObjectSchema: z.ZodType<Prisma.EnumLessonTypeFieldUpdateOperationsInput> = makeSchema() as unknown as z.ZodType<Prisma.EnumLessonTypeFieldUpdateOperationsInput>;
export const EnumLessonTypeFieldUpdateOperationsInputObjectZodSchema = makeSchema();
