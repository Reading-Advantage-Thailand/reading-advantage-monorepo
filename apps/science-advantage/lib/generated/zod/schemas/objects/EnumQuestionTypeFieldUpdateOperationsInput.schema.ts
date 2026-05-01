import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionTypeSchema } from '../enums/QuestionType.schema'

const makeSchema = () => z.object({
  set: QuestionTypeSchema.optional()
}).strict();
export const EnumQuestionTypeFieldUpdateOperationsInputObjectSchema: z.ZodType<Prisma.EnumQuestionTypeFieldUpdateOperationsInput> = makeSchema() as unknown as z.ZodType<Prisma.EnumQuestionTypeFieldUpdateOperationsInput>;
export const EnumQuestionTypeFieldUpdateOperationsInputObjectZodSchema = makeSchema();
