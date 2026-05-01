import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { NullableStringFieldUpdateOperationsInputObjectSchema as NullableStringFieldUpdateOperationsInputObjectSchema } from './NullableStringFieldUpdateOperationsInput.schema';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { EnumLessonTypeFieldUpdateOperationsInputObjectSchema as EnumLessonTypeFieldUpdateOperationsInputObjectSchema } from './EnumLessonTypeFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { StandardUncheckedUpdateManyWithoutLessonsNestedInputObjectSchema as StandardUncheckedUpdateManyWithoutLessonsNestedInputObjectSchema } from './StandardUncheckedUpdateManyWithoutLessonsNestedInput.schema';
import { QuizQuestionUncheckedUpdateManyWithoutLessonNestedInputObjectSchema as QuizQuestionUncheckedUpdateManyWithoutLessonNestedInputObjectSchema } from './QuizQuestionUncheckedUpdateManyWithoutLessonNestedInput.schema';
import { AttemptUncheckedUpdateManyWithoutLessonNestedInputObjectSchema as AttemptUncheckedUpdateManyWithoutLessonNestedInputObjectSchema } from './AttemptUncheckedUpdateManyWithoutLessonNestedInput.schema';
import { LessonCompletionUncheckedUpdateManyWithoutLessonNestedInputObjectSchema as LessonCompletionUncheckedUpdateManyWithoutLessonNestedInputObjectSchema } from './LessonCompletionUncheckedUpdateManyWithoutLessonNestedInput.schema';
import { AssignmentUncheckedUpdateManyWithoutLessonNestedInputObjectSchema as AssignmentUncheckedUpdateManyWithoutLessonNestedInputObjectSchema } from './AssignmentUncheckedUpdateManyWithoutLessonNestedInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  slug: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  titleThai: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  description: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  descriptionThai: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  content: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  structuredContent: z.union([NullableJsonNullValueInputSchema, jsonSchema]).optional(),
  lessonType: z.union([LessonTypeSchema, z.lazy(() => EnumLessonTypeFieldUpdateOperationsInputObjectSchema)]).optional(),
  gradeLevel: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  order: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  standards: z.lazy(() => StandardUncheckedUpdateManyWithoutLessonsNestedInputObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionUncheckedUpdateManyWithoutLessonNestedInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptUncheckedUpdateManyWithoutLessonNestedInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionUncheckedUpdateManyWithoutLessonNestedInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentUncheckedUpdateManyWithoutLessonNestedInputObjectSchema).optional()
}).strict();
export const LessonUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.LessonUncheckedUpdateWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUncheckedUpdateWithoutCurriculumUnitsInput>;
export const LessonUncheckedUpdateWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
