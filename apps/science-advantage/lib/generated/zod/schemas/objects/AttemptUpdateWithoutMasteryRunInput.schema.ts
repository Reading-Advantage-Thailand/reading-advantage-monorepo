import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { FloatFieldUpdateOperationsInputObjectSchema as FloatFieldUpdateOperationsInputObjectSchema } from './FloatFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { NullableDateTimeFieldUpdateOperationsInputObjectSchema as NullableDateTimeFieldUpdateOperationsInputObjectSchema } from './NullableDateTimeFieldUpdateOperationsInput.schema';
import { userUpdateOneRequiredWithoutAttemptsNestedInputObjectSchema as userUpdateOneRequiredWithoutAttemptsNestedInputObjectSchema } from './userUpdateOneRequiredWithoutAttemptsNestedInput.schema';
import { LessonUpdateOneRequiredWithoutAttemptsNestedInputObjectSchema as LessonUpdateOneRequiredWithoutAttemptsNestedInputObjectSchema } from './LessonUpdateOneRequiredWithoutAttemptsNestedInput.schema';
import { QuestionResponseUpdateManyWithoutAttemptNestedInputObjectSchema as QuestionResponseUpdateManyWithoutAttemptNestedInputObjectSchema } from './QuestionResponseUpdateManyWithoutAttemptNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  score: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputObjectSchema)]).optional(),
  maxScore: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputObjectSchema)]).optional(),
  attemptNumber: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  startedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  completedAt: z.union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  student: z.lazy(() => userUpdateOneRequiredWithoutAttemptsNestedInputObjectSchema).optional(),
  lesson: z.lazy(() => LessonUpdateOneRequiredWithoutAttemptsNestedInputObjectSchema).optional(),
  questionResponses: z.lazy(() => QuestionResponseUpdateManyWithoutAttemptNestedInputObjectSchema).optional()
}).strict();
export const AttemptUpdateWithoutMasteryRunInputObjectSchema: z.ZodType<Prisma.AttemptUpdateWithoutMasteryRunInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateWithoutMasteryRunInput>;
export const AttemptUpdateWithoutMasteryRunInputObjectZodSchema = makeSchema();
