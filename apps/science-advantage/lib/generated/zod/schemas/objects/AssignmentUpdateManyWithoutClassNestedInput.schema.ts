import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateWithoutClassInputObjectSchema as AssignmentCreateWithoutClassInputObjectSchema } from './AssignmentCreateWithoutClassInput.schema';
import { AssignmentUncheckedCreateWithoutClassInputObjectSchema as AssignmentUncheckedCreateWithoutClassInputObjectSchema } from './AssignmentUncheckedCreateWithoutClassInput.schema';
import { AssignmentCreateOrConnectWithoutClassInputObjectSchema as AssignmentCreateOrConnectWithoutClassInputObjectSchema } from './AssignmentCreateOrConnectWithoutClassInput.schema';
import { AssignmentUpsertWithWhereUniqueWithoutClassInputObjectSchema as AssignmentUpsertWithWhereUniqueWithoutClassInputObjectSchema } from './AssignmentUpsertWithWhereUniqueWithoutClassInput.schema';
import { AssignmentCreateManyClassInputEnvelopeObjectSchema as AssignmentCreateManyClassInputEnvelopeObjectSchema } from './AssignmentCreateManyClassInputEnvelope.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithWhereUniqueWithoutClassInputObjectSchema as AssignmentUpdateWithWhereUniqueWithoutClassInputObjectSchema } from './AssignmentUpdateWithWhereUniqueWithoutClassInput.schema';
import { AssignmentUpdateManyWithWhereWithoutClassInputObjectSchema as AssignmentUpdateManyWithWhereWithoutClassInputObjectSchema } from './AssignmentUpdateManyWithWhereWithoutClassInput.schema';
import { AssignmentScalarWhereInputObjectSchema as AssignmentScalarWhereInputObjectSchema } from './AssignmentScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AssignmentCreateWithoutClassInputObjectSchema), z.lazy(() => AssignmentCreateWithoutClassInputObjectSchema).array(), z.lazy(() => AssignmentUncheckedCreateWithoutClassInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutClassInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AssignmentCreateOrConnectWithoutClassInputObjectSchema), z.lazy(() => AssignmentCreateOrConnectWithoutClassInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => AssignmentUpsertWithWhereUniqueWithoutClassInputObjectSchema), z.lazy(() => AssignmentUpsertWithWhereUniqueWithoutClassInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AssignmentCreateManyClassInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => AssignmentUpdateWithWhereUniqueWithoutClassInputObjectSchema), z.lazy(() => AssignmentUpdateWithWhereUniqueWithoutClassInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => AssignmentUpdateManyWithWhereWithoutClassInputObjectSchema), z.lazy(() => AssignmentUpdateManyWithWhereWithoutClassInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => AssignmentScalarWhereInputObjectSchema), z.lazy(() => AssignmentScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const AssignmentUpdateManyWithoutClassNestedInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateManyWithoutClassNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateManyWithoutClassNestedInput>;
export const AssignmentUpdateManyWithoutClassNestedInputObjectZodSchema = makeSchema();
