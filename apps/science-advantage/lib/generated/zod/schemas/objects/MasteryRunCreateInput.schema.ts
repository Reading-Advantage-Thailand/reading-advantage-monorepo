import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { AttemptCreateNestedOneWithoutMasteryRunInputObjectSchema as AttemptCreateNestedOneWithoutMasteryRunInputObjectSchema } from './AttemptCreateNestedOneWithoutMasteryRunInput.schema';
import { userCreateNestedOneWithoutMasteryRunsInputObjectSchema as userCreateNestedOneWithoutMasteryRunsInputObjectSchema } from './userCreateNestedOneWithoutMasteryRunsInput.schema'

const makeSchema = () => z.object({
  status: MasteryRunStatusSchema.optional(),
  updatedCount: z.number().int().optional(),
  lastError: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  attempt: z.lazy(() => AttemptCreateNestedOneWithoutMasteryRunInputObjectSchema),
  student: z.lazy(() => userCreateNestedOneWithoutMasteryRunsInputObjectSchema)
}).strict();
export const MasteryRunCreateInputObjectSchema: z.ZodType<Prisma.MasteryRunCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunCreateInput>;
export const MasteryRunCreateInputObjectZodSchema = makeSchema();
