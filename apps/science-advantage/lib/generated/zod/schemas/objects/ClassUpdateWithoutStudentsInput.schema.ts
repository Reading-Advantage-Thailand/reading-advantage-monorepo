import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema as EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema } from './EnumStandardsAlignmentFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { userUpdateOneRequiredWithoutTaughtClassesNestedInputObjectSchema as userUpdateOneRequiredWithoutTaughtClassesNestedInputObjectSchema } from './userUpdateOneRequiredWithoutTaughtClassesNestedInput.schema';
import { CurriculumUnitUpdateManyWithoutClassNestedInputObjectSchema as CurriculumUnitUpdateManyWithoutClassNestedInputObjectSchema } from './CurriculumUnitUpdateManyWithoutClassNestedInput.schema';
import { AssignmentUpdateManyWithoutClassNestedInputObjectSchema as AssignmentUpdateManyWithoutClassNestedInputObjectSchema } from './AssignmentUpdateManyWithoutClassNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  name: z.union([z.string().min(3).max(100).trim(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  gradeLevel: z.union([z.number().int().int().min(3).max(6), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  standardsAlignment: z.union([StandardsAlignmentSchema, z.lazy(() => EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema)]).optional(),
  joinCode: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  teacher: z.lazy(() => userUpdateOneRequiredWithoutTaughtClassesNestedInputObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitUpdateManyWithoutClassNestedInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentUpdateManyWithoutClassNestedInputObjectSchema).optional()
}).strict();
export const ClassUpdateWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassUpdateWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateWithoutStudentsInput>;
export const ClassUpdateWithoutStudentsInputObjectZodSchema = makeSchema();
