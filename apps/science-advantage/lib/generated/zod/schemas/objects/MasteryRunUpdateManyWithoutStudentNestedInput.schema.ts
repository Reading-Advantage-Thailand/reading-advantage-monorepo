import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunCreateWithoutStudentInputObjectSchema as MasteryRunCreateWithoutStudentInputObjectSchema } from './MasteryRunCreateWithoutStudentInput.schema';
import { MasteryRunUncheckedCreateWithoutStudentInputObjectSchema as MasteryRunUncheckedCreateWithoutStudentInputObjectSchema } from './MasteryRunUncheckedCreateWithoutStudentInput.schema';
import { MasteryRunCreateOrConnectWithoutStudentInputObjectSchema as MasteryRunCreateOrConnectWithoutStudentInputObjectSchema } from './MasteryRunCreateOrConnectWithoutStudentInput.schema';
import { MasteryRunUpsertWithWhereUniqueWithoutStudentInputObjectSchema as MasteryRunUpsertWithWhereUniqueWithoutStudentInputObjectSchema } from './MasteryRunUpsertWithWhereUniqueWithoutStudentInput.schema';
import { MasteryRunCreateManyStudentInputEnvelopeObjectSchema as MasteryRunCreateManyStudentInputEnvelopeObjectSchema } from './MasteryRunCreateManyStudentInputEnvelope.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './MasteryRunWhereUniqueInput.schema';
import { MasteryRunUpdateWithWhereUniqueWithoutStudentInputObjectSchema as MasteryRunUpdateWithWhereUniqueWithoutStudentInputObjectSchema } from './MasteryRunUpdateWithWhereUniqueWithoutStudentInput.schema';
import { MasteryRunUpdateManyWithWhereWithoutStudentInputObjectSchema as MasteryRunUpdateManyWithWhereWithoutStudentInputObjectSchema } from './MasteryRunUpdateManyWithWhereWithoutStudentInput.schema';
import { MasteryRunScalarWhereInputObjectSchema as MasteryRunScalarWhereInputObjectSchema } from './MasteryRunScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => MasteryRunCreateWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunCreateWithoutStudentInputObjectSchema).array(), z.lazy(() => MasteryRunUncheckedCreateWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUncheckedCreateWithoutStudentInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => MasteryRunCreateOrConnectWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunCreateOrConnectWithoutStudentInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => MasteryRunUpsertWithWhereUniqueWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUpsertWithWhereUniqueWithoutStudentInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => MasteryRunCreateManyStudentInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => MasteryRunWhereUniqueInputObjectSchema), z.lazy(() => MasteryRunWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => MasteryRunWhereUniqueInputObjectSchema), z.lazy(() => MasteryRunWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => MasteryRunWhereUniqueInputObjectSchema), z.lazy(() => MasteryRunWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => MasteryRunWhereUniqueInputObjectSchema), z.lazy(() => MasteryRunWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => MasteryRunUpdateWithWhereUniqueWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUpdateWithWhereUniqueWithoutStudentInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => MasteryRunUpdateManyWithWhereWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUpdateManyWithWhereWithoutStudentInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => MasteryRunScalarWhereInputObjectSchema), z.lazy(() => MasteryRunScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const MasteryRunUpdateManyWithoutStudentNestedInputObjectSchema: z.ZodType<Prisma.MasteryRunUpdateManyWithoutStudentNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUpdateManyWithoutStudentNestedInput>;
export const MasteryRunUpdateManyWithoutStudentNestedInputObjectZodSchema = makeSchema();
