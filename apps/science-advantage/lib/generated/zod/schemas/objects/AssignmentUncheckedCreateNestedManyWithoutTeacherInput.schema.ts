import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateWithoutTeacherInputObjectSchema as AssignmentCreateWithoutTeacherInputObjectSchema } from './AssignmentCreateWithoutTeacherInput.schema';
import { AssignmentUncheckedCreateWithoutTeacherInputObjectSchema as AssignmentUncheckedCreateWithoutTeacherInputObjectSchema } from './AssignmentUncheckedCreateWithoutTeacherInput.schema';
import { AssignmentCreateOrConnectWithoutTeacherInputObjectSchema as AssignmentCreateOrConnectWithoutTeacherInputObjectSchema } from './AssignmentCreateOrConnectWithoutTeacherInput.schema';
import { AssignmentCreateManyTeacherInputEnvelopeObjectSchema as AssignmentCreateManyTeacherInputEnvelopeObjectSchema } from './AssignmentCreateManyTeacherInputEnvelope.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AssignmentCreateWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentCreateWithoutTeacherInputObjectSchema).array(), z.lazy(() => AssignmentUncheckedCreateWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutTeacherInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AssignmentCreateOrConnectWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentCreateOrConnectWithoutTeacherInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AssignmentCreateManyTeacherInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const AssignmentUncheckedCreateNestedManyWithoutTeacherInputObjectSchema: z.ZodType<Prisma.AssignmentUncheckedCreateNestedManyWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUncheckedCreateNestedManyWithoutTeacherInput>;
export const AssignmentUncheckedCreateNestedManyWithoutTeacherInputObjectZodSchema = makeSchema();
