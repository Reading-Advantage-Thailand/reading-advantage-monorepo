import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema';
import { BoolFieldUpdateOperationsInputObjectSchema as BoolFieldUpdateOperationsInputObjectSchema } from './BoolFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { NullableIntFieldUpdateOperationsInputObjectSchema as NullableIntFieldUpdateOperationsInputObjectSchema } from './NullableIntFieldUpdateOperationsInput.schema';
import { AttemptUpdateOneRequiredWithoutQuestionResponsesNestedInputObjectSchema as AttemptUpdateOneRequiredWithoutQuestionResponsesNestedInputObjectSchema } from './AttemptUpdateOneRequiredWithoutQuestionResponsesNestedInput.schema';
import { QuizQuestionUpdateOneRequiredWithoutResponsesNestedInputObjectSchema as QuizQuestionUpdateOneRequiredWithoutResponsesNestedInputObjectSchema } from './QuizQuestionUpdateOneRequiredWithoutResponsesNestedInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  studentAnswer: z.union([JsonNullValueInputSchema, jsonSchema]).optional(),
  isCorrect: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputObjectSchema)]).optional(),
  timeSpentSeconds: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  answeredAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  order: z.union([z.number().int(), z.lazy(() => NullableIntFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  attempt: z.lazy(() => AttemptUpdateOneRequiredWithoutQuestionResponsesNestedInputObjectSchema).optional(),
  question: z.lazy(() => QuizQuestionUpdateOneRequiredWithoutResponsesNestedInputObjectSchema).optional()
}).strict();
export const QuestionResponseUpdateInputObjectSchema: z.ZodType<Prisma.QuestionResponseUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUpdateInput>;
export const QuestionResponseUpdateInputObjectZodSchema = makeSchema();
