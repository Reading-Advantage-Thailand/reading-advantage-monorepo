import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema as EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema } from './EnumStandardsAlignmentFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { CurriculumUnitUncheckedUpdateManyWithoutClassNestedInputObjectSchema as CurriculumUnitUncheckedUpdateManyWithoutClassNestedInputObjectSchema } from './CurriculumUnitUncheckedUpdateManyWithoutClassNestedInput.schema';
import { AssignmentUncheckedUpdateManyWithoutClassNestedInputObjectSchema as AssignmentUncheckedUpdateManyWithoutClassNestedInputObjectSchema } from './AssignmentUncheckedUpdateManyWithoutClassNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  name: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  gradeLevel: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  standardsAlignment: z.union([StandardsAlignmentSchema, z.lazy(() => EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema)]).optional(),
  joinCode: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  teacherId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitUncheckedUpdateManyWithoutClassNestedInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentUncheckedUpdateManyWithoutClassNestedInputObjectSchema).optional()
}).strict();
export const ClassUncheckedUpdateWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassUncheckedUpdateWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUncheckedUpdateWithoutStudentsInput>;
export const ClassUncheckedUpdateWithoutStudentsInputObjectZodSchema = makeSchema();
