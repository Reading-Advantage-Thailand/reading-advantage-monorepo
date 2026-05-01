import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema'

const makeSchema = () => z.object({
  set: StandardsAlignmentSchema.optional()
}).strict();
export const EnumStandardsAlignmentFieldUpdateOperationsInputObjectSchema: z.ZodType<Prisma.EnumStandardsAlignmentFieldUpdateOperationsInput> = makeSchema() as unknown as z.ZodType<Prisma.EnumStandardsAlignmentFieldUpdateOperationsInput>;
export const EnumStandardsAlignmentFieldUpdateOperationsInputObjectZodSchema = makeSchema();
