import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateWithoutTeacherInputObjectSchema as AssignmentCreateWithoutTeacherInputObjectSchema } from './AssignmentCreateWithoutTeacherInput.schema';
import { AssignmentUncheckedCreateWithoutTeacherInputObjectSchema as AssignmentUncheckedCreateWithoutTeacherInputObjectSchema } from './AssignmentUncheckedCreateWithoutTeacherInput.schema';
import { AssignmentCreateOrConnectWithoutTeacherInputObjectSchema as AssignmentCreateOrConnectWithoutTeacherInputObjectSchema } from './AssignmentCreateOrConnectWithoutTeacherInput.schema';
import { AssignmentUpsertWithWhereUniqueWithoutTeacherInputObjectSchema as AssignmentUpsertWithWhereUniqueWithoutTeacherInputObjectSchema } from './AssignmentUpsertWithWhereUniqueWithoutTeacherInput.schema';
import { AssignmentCreateManyTeacherInputEnvelopeObjectSchema as AssignmentCreateManyTeacherInputEnvelopeObjectSchema } from './AssignmentCreateManyTeacherInputEnvelope.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithWhereUniqueWithoutTeacherInputObjectSchema as AssignmentUpdateWithWhereUniqueWithoutTeacherInputObjectSchema } from './AssignmentUpdateWithWhereUniqueWithoutTeacherInput.schema';
import { AssignmentUpdateManyWithWhereWithoutTeacherInputObjectSchema as AssignmentUpdateManyWithWhereWithoutTeacherInputObjectSchema } from './AssignmentUpdateManyWithWhereWithoutTeacherInput.schema';
import { AssignmentScalarWhereInputObjectSchema as AssignmentScalarWhereInputObjectSchema } from './AssignmentScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AssignmentCreateWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentCreateWithoutTeacherInputObjectSchema).array(), z.lazy(() => AssignmentUncheckedCreateWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutTeacherInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AssignmentCreateOrConnectWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentCreateOrConnectWithoutTeacherInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => AssignmentUpsertWithWhereUniqueWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUpsertWithWhereUniqueWithoutTeacherInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AssignmentCreateManyTeacherInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => AssignmentUpdateWithWhereUniqueWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUpdateWithWhereUniqueWithoutTeacherInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => AssignmentUpdateManyWithWhereWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUpdateManyWithWhereWithoutTeacherInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => AssignmentScalarWhereInputObjectSchema), z.lazy(() => AssignmentScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const AssignmentUncheckedUpdateManyWithoutTeacherNestedInputObjectSchema: z.ZodType<Prisma.AssignmentUncheckedUpdateManyWithoutTeacherNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUncheckedUpdateManyWithoutTeacherNestedInput>;
export const AssignmentUncheckedUpdateManyWithoutTeacherNestedInputObjectZodSchema = makeSchema();
