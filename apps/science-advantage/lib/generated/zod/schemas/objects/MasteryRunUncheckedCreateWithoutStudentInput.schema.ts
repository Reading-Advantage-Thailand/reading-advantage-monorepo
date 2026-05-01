import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema'

const makeSchema = () => z.object({
  attemptId: z.string(),
  status: MasteryRunStatusSchema.optional(),
  updatedCount: z.number().int().optional(),
  lastError: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const MasteryRunUncheckedCreateWithoutStudentInputObjectSchema: z.ZodType<Prisma.MasteryRunUncheckedCreateWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUncheckedCreateWithoutStudentInput>;
export const MasteryRunUncheckedCreateWithoutStudentInputObjectZodSchema = makeSchema();
