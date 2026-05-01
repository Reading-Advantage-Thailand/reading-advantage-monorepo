import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryCreateWithoutStudentInputObjectSchema as StandardMasteryCreateWithoutStudentInputObjectSchema } from './StandardMasteryCreateWithoutStudentInput.schema';
import { StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema as StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema } from './StandardMasteryUncheckedCreateWithoutStudentInput.schema';
import { StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema as StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema } from './StandardMasteryCreateOrConnectWithoutStudentInput.schema';
import { StandardMasteryUpsertWithWhereUniqueWithoutStudentInputObjectSchema as StandardMasteryUpsertWithWhereUniqueWithoutStudentInputObjectSchema } from './StandardMasteryUpsertWithWhereUniqueWithoutStudentInput.schema';
import { StandardMasteryCreateManyStudentInputEnvelopeObjectSchema as StandardMasteryCreateManyStudentInputEnvelopeObjectSchema } from './StandardMasteryCreateManyStudentInputEnvelope.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryUpdateWithWhereUniqueWithoutStudentInputObjectSchema as StandardMasteryUpdateWithWhereUniqueWithoutStudentInputObjectSchema } from './StandardMasteryUpdateWithWhereUniqueWithoutStudentInput.schema';
import { StandardMasteryUpdateManyWithWhereWithoutStudentInputObjectSchema as StandardMasteryUpdateManyWithWhereWithoutStudentInputObjectSchema } from './StandardMasteryUpdateManyWithWhereWithoutStudentInput.schema';
import { StandardMasteryScalarWhereInputObjectSchema as StandardMasteryScalarWhereInputObjectSchema } from './StandardMasteryScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardMasteryCreateWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryCreateWithoutStudentInputObjectSchema).array(), z.lazy(() => StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => StandardMasteryUpsertWithWhereUniqueWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUpsertWithWhereUniqueWithoutStudentInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => StandardMasteryCreateManyStudentInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => StandardMasteryUpdateWithWhereUniqueWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUpdateWithWhereUniqueWithoutStudentInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => StandardMasteryUpdateManyWithWhereWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUpdateManyWithWhereWithoutStudentInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => StandardMasteryScalarWhereInputObjectSchema), z.lazy(() => StandardMasteryScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const StandardMasteryUpdateManyWithoutStudentNestedInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpdateManyWithoutStudentNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpdateManyWithoutStudentNestedInput>;
export const StandardMasteryUpdateManyWithoutStudentNestedInputObjectZodSchema = makeSchema();
