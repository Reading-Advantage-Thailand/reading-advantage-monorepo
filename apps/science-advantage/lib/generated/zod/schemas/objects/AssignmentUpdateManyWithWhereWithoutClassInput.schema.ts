import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentScalarWhereInputObjectSchema as AssignmentScalarWhereInputObjectSchema } from './AssignmentScalarWhereInput.schema';
import { AssignmentUpdateManyMutationInputObjectSchema as AssignmentUpdateManyMutationInputObjectSchema } from './AssignmentUpdateManyMutationInput.schema';
import { AssignmentUncheckedUpdateManyWithoutClassInputObjectSchema as AssignmentUncheckedUpdateManyWithoutClassInputObjectSchema } from './AssignmentUncheckedUpdateManyWithoutClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => AssignmentUpdateManyMutationInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateManyWithoutClassInputObjectSchema)])
}).strict();
export const AssignmentUpdateManyWithWhereWithoutClassInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateManyWithWhereWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateManyWithWhereWithoutClassInput>;
export const AssignmentUpdateManyWithWhereWithoutClassInputObjectZodSchema = makeSchema();
