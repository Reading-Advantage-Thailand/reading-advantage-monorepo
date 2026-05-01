import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema'

const makeSchema = () => z.object({
  set: MasteryRunStatusSchema.optional()
}).strict();
export const EnumMasteryRunStatusFieldUpdateOperationsInputObjectSchema: z.ZodType<Prisma.EnumMasteryRunStatusFieldUpdateOperationsInput> = makeSchema() as unknown as z.ZodType<Prisma.EnumMasteryRunStatusFieldUpdateOperationsInput>;
export const EnumMasteryRunStatusFieldUpdateOperationsInputObjectZodSchema = makeSchema();
