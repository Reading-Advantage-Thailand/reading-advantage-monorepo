import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { DecimalFieldUpdateOperationsInputObjectSchema as DecimalFieldUpdateOperationsInputObjectSchema } from './DecimalFieldUpdateOperationsInput.schema';
import { IntFieldUpdateOperationsInputObjectSchema as IntFieldUpdateOperationsInputObjectSchema } from './IntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { userUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectSchema as userUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectSchema } from './userUpdateOneRequiredWithoutMasteryRecordsNestedInput.schema';
import { StandardUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectSchema as StandardUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectSchema } from './StandardUpdateOneRequiredWithoutMasteryRecordsNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  masteryLevel: z.union([z.number(), z.lazy(() => DecimalFieldUpdateOperationsInputObjectSchema)]).optional(),
  evidenceCount: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional(),
  lastAssessedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  student: z.lazy(() => userUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectSchema).optional(),
  standard: z.lazy(() => StandardUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectSchema).optional()
}).strict();
export const StandardMasteryUpdateInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpdateInput>;
export const StandardMasteryUpdateInputObjectZodSchema = makeSchema();
