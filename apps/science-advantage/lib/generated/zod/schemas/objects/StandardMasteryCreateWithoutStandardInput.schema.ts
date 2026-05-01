import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateNestedOneWithoutMasteryRecordsInputObjectSchema as userCreateNestedOneWithoutMasteryRecordsInputObjectSchema } from './userCreateNestedOneWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  masteryLevel: z.number(),
  evidenceCount: z.number().int().optional(),
  lastAssessedAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  student: z.lazy(() => userCreateNestedOneWithoutMasteryRecordsInputObjectSchema)
}).strict();
export const StandardMasteryCreateWithoutStandardInputObjectSchema: z.ZodType<Prisma.StandardMasteryCreateWithoutStandardInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateWithoutStandardInput>;
export const StandardMasteryCreateWithoutStandardInputObjectZodSchema = makeSchema();
