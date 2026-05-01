import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateNestedOneWithoutMasteryRecordsInputObjectSchema as userCreateNestedOneWithoutMasteryRecordsInputObjectSchema } from './userCreateNestedOneWithoutMasteryRecordsInput.schema';
import { StandardCreateNestedOneWithoutMasteryRecordsInputObjectSchema as StandardCreateNestedOneWithoutMasteryRecordsInputObjectSchema } from './StandardCreateNestedOneWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  masteryLevel: z.number(),
  evidenceCount: z.number().int().optional(),
  lastAssessedAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  student: z.lazy(() => userCreateNestedOneWithoutMasteryRecordsInputObjectSchema),
  standard: z.lazy(() => StandardCreateNestedOneWithoutMasteryRecordsInputObjectSchema)
}).strict();
export const StandardMasteryCreateInputObjectSchema: z.ZodType<Prisma.StandardMasteryCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateInput>;
export const StandardMasteryCreateInputObjectZodSchema = makeSchema();
