import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentScalarWhereInputObjectSchema as AssignmentScalarWhereInputObjectSchema } from './AssignmentScalarWhereInput.schema';
import { AssignmentUpdateManyMutationInputObjectSchema as AssignmentUpdateManyMutationInputObjectSchema } from './AssignmentUpdateManyMutationInput.schema';
import { AssignmentUncheckedUpdateManyWithoutTeacherInputObjectSchema as AssignmentUncheckedUpdateManyWithoutTeacherInputObjectSchema } from './AssignmentUncheckedUpdateManyWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => AssignmentUpdateManyMutationInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateManyWithoutTeacherInputObjectSchema)])
}).strict();
export const AssignmentUpdateManyWithWhereWithoutTeacherInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateManyWithWhereWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateManyWithWhereWithoutTeacherInput>;
export const AssignmentUpdateManyWithWhereWithoutTeacherInputObjectZodSchema = makeSchema();
