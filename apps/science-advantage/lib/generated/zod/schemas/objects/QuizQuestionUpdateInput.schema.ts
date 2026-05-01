import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { QuestionTypeSchema } from '../enums/QuestionType.schema';
import { EnumQuestionTypeFieldUpdateOperationsInputObjectSchema as EnumQuestionTypeFieldUpdateOperationsInputObjectSchema } from './EnumQuestionTypeFieldUpdateOperationsInput.schema';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { LessonUpdateOneRequiredWithoutQuizQuestionsNestedInputObjectSchema as LessonUpdateOneRequiredWithoutQuizQuestionsNestedInputObjectSchema } from './LessonUpdateOneRequiredWithoutQuizQuestionsNestedInput.schema';
import { StandardUpdateManyWithoutQuizQuestionsNestedInputObjectSchema as StandardUpdateManyWithoutQuizQuestionsNestedInputObjectSchema } from './StandardUpdateManyWithoutQuizQuestionsNestedInput.schema';
import { QuestionResponseUpdateManyWithoutQuestionNestedInputObjectSchema as QuestionResponseUpdateManyWithoutQuestionNestedInputObjectSchema } from './QuestionResponseUpdateManyWithoutQuestionNestedInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  slug: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  type: z.union([QuestionTypeSchema, z.lazy(() => EnumQuestionTypeFieldUpdateOperationsInputObjectSchema)]).optional(),
  text: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  options: z.union([NullableJsonNullValueInputSchema, jsonSchema]).optional(),
  correctAnswer: z.union([JsonNullValueInputSchema, jsonSchema]).optional(),
  points: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  order: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  version: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  lesson: z.lazy(() => LessonUpdateOneRequiredWithoutQuizQuestionsNestedInputObjectSchema).optional(),
  standards: z.lazy(() => StandardUpdateManyWithoutQuizQuestionsNestedInputObjectSchema).optional(),
  responses: z.lazy(() => QuestionResponseUpdateManyWithoutQuestionNestedInputObjectSchema).optional()
}).strict();
export const QuizQuestionUpdateInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpdateInput>;
export const QuizQuestionUpdateInputObjectZodSchema = makeSchema();
