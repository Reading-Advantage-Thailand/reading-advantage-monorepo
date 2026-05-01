import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema as EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema } from './EnumStandardsAlignmentFieldUpdateOperationsInput.schema';
import { NullableIntFieldUpdateOperationsInputObjectSchema as NullableIntFieldUpdateOperationsInputObjectSchema } from './NullableIntFieldUpdateOperationsInput.schema';
import { LessonUpdateManyWithoutStandardsNestedInputObjectSchema as LessonUpdateManyWithoutStandardsNestedInputObjectSchema } from './LessonUpdateManyWithoutStandardsNestedInput.schema';
import { QuizQuestionUpdateManyWithoutStandardsNestedInputObjectSchema as QuizQuestionUpdateManyWithoutStandardsNestedInputObjectSchema } from './QuizQuestionUpdateManyWithoutStandardsNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  framework: z.union([StandardsAlignmentSchema, z.lazy(() => EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema)]).optional(),
  code: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  description: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  gradeLevel: z.union([z.number().int(), z.lazy(() => NullableIntFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  lessons: z.lazy(() => LessonUpdateManyWithoutStandardsNestedInputObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionUpdateManyWithoutStandardsNestedInputObjectSchema).optional()
}).strict();
export const StandardUpdateWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.StandardUpdateWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateWithoutMasteryRecordsInput>;
export const StandardUpdateWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
