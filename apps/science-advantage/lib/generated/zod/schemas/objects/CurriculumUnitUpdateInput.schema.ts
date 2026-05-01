import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { NullableStringFieldUpdateOperationsInputObjectSchema as NullableStringFieldUpdateOperationsInputObjectSchema } from './NullableStringFieldUpdateOperationsInput.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema as EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema } from './EnumStandardsAlignmentFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { LessonUpdateManyWithoutCurriculumUnitsNestedInputObjectSchema as LessonUpdateManyWithoutCurriculumUnitsNestedInputObjectSchema } from './LessonUpdateManyWithoutCurriculumUnitsNestedInput.schema';
import { ClassUpdateOneRequiredWithoutCurriculumUnitsNestedInputObjectSchema as ClassUpdateOneRequiredWithoutCurriculumUnitsNestedInputObjectSchema } from './ClassUpdateOneRequiredWithoutCurriculumUnitsNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  slug: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  description: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  framework: z.union([StandardsAlignmentSchema, z.lazy(() => EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema)]).optional(),
  gradeLevel: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  order: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  lessons: z.lazy(() => LessonUpdateManyWithoutCurriculumUnitsNestedInputObjectSchema).optional(),
  class: z.lazy(() => ClassUpdateOneRequiredWithoutCurriculumUnitsNestedInputObjectSchema).optional()
}).strict();
export const CurriculumUnitUpdateInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUpdateInput>;
export const CurriculumUnitUpdateInputObjectZodSchema = makeSchema();
