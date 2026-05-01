import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { QuestionTypeSchema } from '../enums/QuestionType.schema';
import { EnumQuestionTypeFieldUpdateOperationsInputObjectSchema as EnumQuestionTypeFieldUpdateOperationsInputObjectSchema } from './EnumQuestionTypeFieldUpdateOperationsInput.schema';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { StandardUncheckedUpdateManyWithoutQuizQuestionsNestedInputObjectSchema as StandardUncheckedUpdateManyWithoutQuizQuestionsNestedInputObjectSchema } from './StandardUncheckedUpdateManyWithoutQuizQuestionsNestedInput.schema';
import { QuestionResponseUncheckedUpdateManyWithoutQuestionNestedInputObjectSchema as QuestionResponseUncheckedUpdateManyWithoutQuestionNestedInputObjectSchema } from './QuestionResponseUncheckedUpdateManyWithoutQuestionNestedInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  slug: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  lessonId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  type: z.union([QuestionTypeSchema, z.lazy(() => EnumQuestionTypeFieldUpdateOperationsInputObjectSchema)]).optional(),
  text: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  options: z.union([NullableJsonNullValueInputSchema, jsonSchema]).optional(),
  correctAnswer: z.union([JsonNullValueInputSchema, jsonSchema]).optional(),
  points: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  order: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  version: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  standards: z.lazy(() => StandardUncheckedUpdateManyWithoutQuizQuestionsNestedInputObjectSchema).optional(),
  responses: z.lazy(() => QuestionResponseUncheckedUpdateManyWithoutQuestionNestedInputObjectSchema).optional()
}).strict();
export const QuizQuestionUncheckedUpdateInputObjectSchema: z.ZodType<Prisma.QuizQuestionUncheckedUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUncheckedUpdateInput>;
export const QuizQuestionUncheckedUpdateInputObjectZodSchema = makeSchema();
