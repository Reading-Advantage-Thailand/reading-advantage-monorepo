import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { FloatFieldUpdateOperationsInputObjectSchema as FloatFieldUpdateOperationsInputObjectSchema } from './FloatFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { NullableDateTimeFieldUpdateOperationsInputObjectSchema as NullableDateTimeFieldUpdateOperationsInputObjectSchema } from './NullableDateTimeFieldUpdateOperationsInput.schema';
import { QuestionResponseUncheckedUpdateManyWithoutAttemptNestedInputObjectSchema as QuestionResponseUncheckedUpdateManyWithoutAttemptNestedInputObjectSchema } from './QuestionResponseUncheckedUpdateManyWithoutAttemptNestedInput.schema';
import { MasteryRunUncheckedUpdateOneWithoutAttemptNestedInputObjectSchema as MasteryRunUncheckedUpdateOneWithoutAttemptNestedInputObjectSchema } from './MasteryRunUncheckedUpdateOneWithoutAttemptNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  studentId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  lessonId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  score: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputObjectSchema)]).optional(),
  maxScore: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputObjectSchema)]).optional(),
  attemptNumber: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  startedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  completedAt: z.union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  questionResponses: z.lazy(() => QuestionResponseUncheckedUpdateManyWithoutAttemptNestedInputObjectSchema).optional(),
  masteryRun: z.lazy(() => MasteryRunUncheckedUpdateOneWithoutAttemptNestedInputObjectSchema).optional()
}).strict();
export const AttemptUncheckedUpdateInputObjectSchema: z.ZodType<Prisma.AttemptUncheckedUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUncheckedUpdateInput>;
export const AttemptUncheckedUpdateInputObjectZodSchema = makeSchema();
