import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardCreateNestedOneWithoutMasteryRecordsInputObjectSchema as StandardCreateNestedOneWithoutMasteryRecordsInputObjectSchema } from './StandardCreateNestedOneWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  masteryLevel: z.number(),
  evidenceCount: z.number().int().optional(),
  lastAssessedAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  standard: z.lazy(() => StandardCreateNestedOneWithoutMasteryRecordsInputObjectSchema)
}).strict();
export const StandardMasteryCreateWithoutStudentInputObjectSchema: z.ZodType<Prisma.StandardMasteryCreateWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateWithoutStudentInput>;
export const StandardMasteryCreateWithoutStudentInputObjectZodSchema = makeSchema();
