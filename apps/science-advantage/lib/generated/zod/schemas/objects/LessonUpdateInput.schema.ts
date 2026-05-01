import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { NullableStringFieldUpdateOperationsInputObjectSchema as NullableStringFieldUpdateOperationsInputObjectSchema } from './NullableStringFieldUpdateOperationsInput.schema';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { EnumLessonTypeFieldUpdateOperationsInputObjectSchema as EnumLessonTypeFieldUpdateOperationsInputObjectSchema } from './EnumLessonTypeFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { StandardUpdateManyWithoutLessonsNestedInputObjectSchema as StandardUpdateManyWithoutLessonsNestedInputObjectSchema } from './StandardUpdateManyWithoutLessonsNestedInput.schema';
import { CurriculumUnitUpdateManyWithoutLessonsNestedInputObjectSchema as CurriculumUnitUpdateManyWithoutLessonsNestedInputObjectSchema } from './CurriculumUnitUpdateManyWithoutLessonsNestedInput.schema';
import { QuizQuestionUpdateManyWithoutLessonNestedInputObjectSchema as QuizQuestionUpdateManyWithoutLessonNestedInputObjectSchema } from './QuizQuestionUpdateManyWithoutLessonNestedInput.schema';
import { AttemptUpdateManyWithoutLessonNestedInputObjectSchema as AttemptUpdateManyWithoutLessonNestedInputObjectSchema } from './AttemptUpdateManyWithoutLessonNestedInput.schema';
import { LessonCompletionUpdateManyWithoutLessonNestedInputObjectSchema as LessonCompletionUpdateManyWithoutLessonNestedInputObjectSchema } from './LessonCompletionUpdateManyWithoutLessonNestedInput.schema';
import { AssignmentUpdateManyWithoutLessonNestedInputObjectSchema as AssignmentUpdateManyWithoutLessonNestedInputObjectSchema } from './AssignmentUpdateManyWithoutLessonNestedInput.schema'

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
  standards: z.lazy(() => StandardUpdateManyWithoutLessonsNestedInputObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitUpdateManyWithoutLessonsNestedInputObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionUpdateManyWithoutLessonNestedInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptUpdateManyWithoutLessonNestedInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionUpdateManyWithoutLessonNestedInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentUpdateManyWithoutLessonNestedInputObjectSchema).optional()
}).strict();
export const LessonUpdateInputObjectSchema: z.ZodType<Prisma.LessonUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateInput>;
export const LessonUpdateInputObjectZodSchema = makeSchema();
