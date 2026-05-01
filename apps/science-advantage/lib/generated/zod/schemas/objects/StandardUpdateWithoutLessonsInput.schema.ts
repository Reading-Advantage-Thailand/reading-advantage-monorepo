import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema as EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema } from './EnumStandardsAlignmentFieldUpdateOperationsInput.schema';
import { NullableIntFieldUpdateOperationsInputObjectSchema as NullableIntFieldUpdateOperationsInputObjectSchema } from './NullableIntFieldUpdateOperationsInput.schema';
import { QuizQuestionUpdateManyWithoutStandardsNestedInputObjectSchema as QuizQuestionUpdateManyWithoutStandardsNestedInputObjectSchema } from './QuizQuestionUpdateManyWithoutStandardsNestedInput.schema';
import { StandardMasteryUpdateManyWithoutStandardNestedInputObjectSchema as StandardMasteryUpdateManyWithoutStandardNestedInputObjectSchema } from './StandardMasteryUpdateManyWithoutStandardNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  framework: z.union([StandardsAlignmentSchema, z.lazy(() => EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema)]).optional(),
  code: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  description: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  gradeLevel: z.union([z.number().int(), z.lazy(() => NullableIntFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  quizQuestions: z.lazy(() => QuizQuestionUpdateManyWithoutStandardsNestedInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryUpdateManyWithoutStandardNestedInputObjectSchema).optional()
}).strict();
export const StandardUpdateWithoutLessonsInputObjectSchema: z.ZodType<Prisma.StandardUpdateWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateWithoutLessonsInput>;
export const StandardUpdateWithoutLessonsInputObjectZodSchema = makeSchema();
