import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { EnumMasteryRunStatusFieldUpdateOperationsInputObjectSchema as EnumMasteryRunStatusFieldUpdateOperationsInputObjectSchema } from './EnumMasteryRunStatusFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { NullableStringFieldUpdateOperationsInputObjectSchema as NullableStringFieldUpdateOperationsInputObjectSchema } from './NullableStringFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { AttemptUpdateOneRequiredWithoutMasteryRunNestedInputObjectSchema as AttemptUpdateOneRequiredWithoutMasteryRunNestedInputObjectSchema } from './AttemptUpdateOneRequiredWithoutMasteryRunNestedInput.schema'

const makeSchema = () => z.object({
  status: z.union([MasteryRunStatusSchema, z.lazy(() => EnumMasteryRunStatusFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedCount: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  lastError: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  attempt: z.lazy(() => AttemptUpdateOneRequiredWithoutMasteryRunNestedInputObjectSchema).optional()
}).strict();
export const MasteryRunUpdateWithoutStudentInputObjectSchema: z.ZodType<Prisma.MasteryRunUpdateWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUpdateWithoutStudentInput>;
export const MasteryRunUpdateWithoutStudentInputObjectZodSchema = makeSchema();
