import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateWithoutStudentInputObjectSchema as AttemptCreateWithoutStudentInputObjectSchema } from './AttemptCreateWithoutStudentInput.schema';
import { AttemptUncheckedCreateWithoutStudentInputObjectSchema as AttemptUncheckedCreateWithoutStudentInputObjectSchema } from './AttemptUncheckedCreateWithoutStudentInput.schema';
import { AttemptCreateOrConnectWithoutStudentInputObjectSchema as AttemptCreateOrConnectWithoutStudentInputObjectSchema } from './AttemptCreateOrConnectWithoutStudentInput.schema';
import { AttemptUpsertWithWhereUniqueWithoutStudentInputObjectSchema as AttemptUpsertWithWhereUniqueWithoutStudentInputObjectSchema } from './AttemptUpsertWithWhereUniqueWithoutStudentInput.schema';
import { AttemptCreateManyStudentInputEnvelopeObjectSchema as AttemptCreateManyStudentInputEnvelopeObjectSchema } from './AttemptCreateManyStudentInputEnvelope.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptUpdateWithWhereUniqueWithoutStudentInputObjectSchema as AttemptUpdateWithWhereUniqueWithoutStudentInputObjectSchema } from './AttemptUpdateWithWhereUniqueWithoutStudentInput.schema';
import { AttemptUpdateManyWithWhereWithoutStudentInputObjectSchema as AttemptUpdateManyWithWhereWithoutStudentInputObjectSchema } from './AttemptUpdateManyWithWhereWithoutStudentInput.schema';
import { AttemptScalarWhereInputObjectSchema as AttemptScalarWhereInputObjectSchema } from './AttemptScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AttemptCreateWithoutStudentInputObjectSchema), z.lazy(() => AttemptCreateWithoutStudentInputObjectSchema).array(), z.lazy(() => AttemptUncheckedCreateWithoutStudentInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutStudentInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AttemptCreateOrConnectWithoutStudentInputObjectSchema), z.lazy(() => AttemptCreateOrConnectWithoutStudentInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => AttemptUpsertWithWhereUniqueWithoutStudentInputObjectSchema), z.lazy(() => AttemptUpsertWithWhereUniqueWithoutStudentInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AttemptCreateManyStudentInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => AttemptUpdateWithWhereUniqueWithoutStudentInputObjectSchema), z.lazy(() => AttemptUpdateWithWhereUniqueWithoutStudentInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => AttemptUpdateManyWithWhereWithoutStudentInputObjectSchema), z.lazy(() => AttemptUpdateManyWithWhereWithoutStudentInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => AttemptScalarWhereInputObjectSchema), z.lazy(() => AttemptScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const AttemptUncheckedUpdateManyWithoutStudentNestedInputObjectSchema: z.ZodType<Prisma.AttemptUncheckedUpdateManyWithoutStudentNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUncheckedUpdateManyWithoutStudentNestedInput>;
export const AttemptUncheckedUpdateManyWithoutStudentNestedInputObjectZodSchema = makeSchema();
