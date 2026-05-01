import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { userCreateNestedOneWithoutMasteryRunsInputObjectSchema as userCreateNestedOneWithoutMasteryRunsInputObjectSchema } from './userCreateNestedOneWithoutMasteryRunsInput.schema'

const makeSchema = () => z.object({
  status: MasteryRunStatusSchema.optional(),
  updatedCount: z.number().int().optional(),
  lastError: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  student: z.lazy(() => userCreateNestedOneWithoutMasteryRunsInputObjectSchema)
}).strict();
export const MasteryRunCreateWithoutAttemptInputObjectSchema: z.ZodType<Prisma.MasteryRunCreateWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunCreateWithoutAttemptInput>;
export const MasteryRunCreateWithoutAttemptInputObjectZodSchema = makeSchema();
