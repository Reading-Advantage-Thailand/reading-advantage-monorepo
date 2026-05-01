import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { AttemptCreateNestedOneWithoutMasteryRunInputObjectSchema as AttemptCreateNestedOneWithoutMasteryRunInputObjectSchema } from './AttemptCreateNestedOneWithoutMasteryRunInput.schema'

const makeSchema = () => z.object({
  status: MasteryRunStatusSchema.optional(),
  updatedCount: z.number().int().optional(),
  lastError: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  attempt: z.lazy(() => AttemptCreateNestedOneWithoutMasteryRunInputObjectSchema)
}).strict();
export const MasteryRunCreateWithoutStudentInputObjectSchema: z.ZodType<Prisma.MasteryRunCreateWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunCreateWithoutStudentInput>;
export const MasteryRunCreateWithoutStudentInputObjectZodSchema = makeSchema();
