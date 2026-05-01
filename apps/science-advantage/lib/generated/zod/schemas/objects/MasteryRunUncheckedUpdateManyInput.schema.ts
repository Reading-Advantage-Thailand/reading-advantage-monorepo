import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { EnumMasteryRunStatusFieldUpdateOperationsInputObjectSchema as EnumMasteryRunStatusFieldUpdateOperationsInputObjectSchema } from './EnumMasteryRunStatusFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { NullableStringFieldUpdateOperationsInputObjectSchema as NullableStringFieldUpdateOperationsInputObjectSchema } from './NullableStringFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema'

const makeSchema = () => z.object({
  attemptId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  studentId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  status: z.union([MasteryRunStatusSchema, z.lazy(() => EnumMasteryRunStatusFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedCount: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  lastError: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional()
}).strict();
export const MasteryRunUncheckedUpdateManyInputObjectSchema: z.ZodType<Prisma.MasteryRunUncheckedUpdateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUncheckedUpdateManyInput>;
export const MasteryRunUncheckedUpdateManyInputObjectZodSchema = makeSchema();
