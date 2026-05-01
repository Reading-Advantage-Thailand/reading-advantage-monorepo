import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateWithoutClassInputObjectSchema as AssignmentCreateWithoutClassInputObjectSchema } from './AssignmentCreateWithoutClassInput.schema';
import { AssignmentUncheckedCreateWithoutClassInputObjectSchema as AssignmentUncheckedCreateWithoutClassInputObjectSchema } from './AssignmentUncheckedCreateWithoutClassInput.schema';
import { AssignmentCreateOrConnectWithoutClassInputObjectSchema as AssignmentCreateOrConnectWithoutClassInputObjectSchema } from './AssignmentCreateOrConnectWithoutClassInput.schema';
import { AssignmentCreateManyClassInputEnvelopeObjectSchema as AssignmentCreateManyClassInputEnvelopeObjectSchema } from './AssignmentCreateManyClassInputEnvelope.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AssignmentCreateWithoutClassInputObjectSchema), z.lazy(() => AssignmentCreateWithoutClassInputObjectSchema).array(), z.lazy(() => AssignmentUncheckedCreateWithoutClassInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutClassInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AssignmentCreateOrConnectWithoutClassInputObjectSchema), z.lazy(() => AssignmentCreateOrConnectWithoutClassInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AssignmentCreateManyClassInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const AssignmentUncheckedCreateNestedManyWithoutClassInputObjectSchema: z.ZodType<Prisma.AssignmentUncheckedCreateNestedManyWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUncheckedCreateNestedManyWithoutClassInput>;
export const AssignmentUncheckedCreateNestedManyWithoutClassInputObjectZodSchema = makeSchema();
