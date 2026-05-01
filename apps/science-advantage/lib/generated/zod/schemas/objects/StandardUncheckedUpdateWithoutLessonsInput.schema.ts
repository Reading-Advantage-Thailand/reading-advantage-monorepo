import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema as EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema } from './EnumStandardsAlignmentFieldUpdateOperationsInput.schema';
import { NullableIntFieldUpdateOperationsInputObjectSchema as NullableIntFieldUpdateOperationsInputObjectSchema } from './NullableIntFieldUpdateOperationsInput.schema';
import { QuizQuestionUncheckedUpdateManyWithoutStandardsNestedInputObjectSchema as QuizQuestionUncheckedUpdateManyWithoutStandardsNestedInputObjectSchema } from './QuizQuestionUncheckedUpdateManyWithoutStandardsNestedInput.schema';
import { StandardMasteryUncheckedUpdateManyWithoutStandardNestedInputObjectSchema as StandardMasteryUncheckedUpdateManyWithoutStandardNestedInputObjectSchema } from './StandardMasteryUncheckedUpdateManyWithoutStandardNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  framework: z.union([StandardsAlignmentSchema, z.lazy(() => EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema)]).optional(),
  code: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  description: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  gradeLevel: z.union([z.number().int(), z.lazy(() => NullableIntFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  quizQuestions: z.lazy(() => QuizQuestionUncheckedUpdateManyWithoutStandardsNestedInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryUncheckedUpdateManyWithoutStandardNestedInputObjectSchema).optional()
}).strict();
export const StandardUncheckedUpdateWithoutLessonsInputObjectSchema: z.ZodType<Prisma.StandardUncheckedUpdateWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUncheckedUpdateWithoutLessonsInput>;
export const StandardUncheckedUpdateWithoutLessonsInputObjectZodSchema = makeSchema();
