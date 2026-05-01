import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema'

const makeSchema = () => z.object({
  set: LessonCompletionStatusSchema.optional()
}).strict();
export const EnumLessonCompletionStatusFieldUpdateOperationsInputObjectSchema: z.ZodType<Prisma.EnumLessonCompletionStatusFieldUpdateOperationsInput> = makeSchema() as unknown as z.ZodType<Prisma.EnumLessonCompletionStatusFieldUpdateOperationsInput>;
export const EnumLessonCompletionStatusFieldUpdateOperationsInputObjectZodSchema = makeSchema();
