import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { NullableDateTimeFieldUpdateOperationsInputObjectSchema as NullableDateTimeFieldUpdateOperationsInputObjectSchema } from './NullableDateTimeFieldUpdateOperationsInput.schema';
import { ClassUpdateOneRequiredWithoutAssignmentsNestedInputObjectSchema as ClassUpdateOneRequiredWithoutAssignmentsNestedInputObjectSchema } from './ClassUpdateOneRequiredWithoutAssignmentsNestedInput.schema';
import { LessonUpdateOneRequiredWithoutAssignmentsNestedInputObjectSchema as LessonUpdateOneRequiredWithoutAssignmentsNestedInputObjectSchema } from './LessonUpdateOneRequiredWithoutAssignmentsNestedInput.schema';
import { userUpdateOneRequiredWithoutAssignedLessonsNestedInputObjectSchema as userUpdateOneRequiredWithoutAssignedLessonsNestedInputObjectSchema } from './userUpdateOneRequiredWithoutAssignedLessonsNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  assignedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  dueAt: z.union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  class: z.lazy(() => ClassUpdateOneRequiredWithoutAssignmentsNestedInputObjectSchema).optional(),
  lesson: z.lazy(() => LessonUpdateOneRequiredWithoutAssignmentsNestedInputObjectSchema).optional(),
  teacher: z.lazy(() => userUpdateOneRequiredWithoutAssignedLessonsNestedInputObjectSchema).optional()
}).strict();
export const AssignmentUpdateInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateInput>;
export const AssignmentUpdateInputObjectZodSchema = makeSchema();
