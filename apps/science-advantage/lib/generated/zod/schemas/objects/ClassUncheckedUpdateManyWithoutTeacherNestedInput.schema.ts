import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateWithoutTeacherInputObjectSchema as ClassCreateWithoutTeacherInputObjectSchema } from './ClassCreateWithoutTeacherInput.schema';
import { ClassUncheckedCreateWithoutTeacherInputObjectSchema as ClassUncheckedCreateWithoutTeacherInputObjectSchema } from './ClassUncheckedCreateWithoutTeacherInput.schema';
import { ClassCreateOrConnectWithoutTeacherInputObjectSchema as ClassCreateOrConnectWithoutTeacherInputObjectSchema } from './ClassCreateOrConnectWithoutTeacherInput.schema';
import { ClassUpsertWithWhereUniqueWithoutTeacherInputObjectSchema as ClassUpsertWithWhereUniqueWithoutTeacherInputObjectSchema } from './ClassUpsertWithWhereUniqueWithoutTeacherInput.schema';
import { ClassCreateManyTeacherInputEnvelopeObjectSchema as ClassCreateManyTeacherInputEnvelopeObjectSchema } from './ClassCreateManyTeacherInputEnvelope.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassUpdateWithWhereUniqueWithoutTeacherInputObjectSchema as ClassUpdateWithWhereUniqueWithoutTeacherInputObjectSchema } from './ClassUpdateWithWhereUniqueWithoutTeacherInput.schema';
import { ClassUpdateManyWithWhereWithoutTeacherInputObjectSchema as ClassUpdateManyWithWhereWithoutTeacherInputObjectSchema } from './ClassUpdateManyWithWhereWithoutTeacherInput.schema';
import { ClassScalarWhereInputObjectSchema as ClassScalarWhereInputObjectSchema } from './ClassScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => ClassCreateWithoutTeacherInputObjectSchema), z.lazy(() => ClassCreateWithoutTeacherInputObjectSchema).array(), z.lazy(() => ClassUncheckedCreateWithoutTeacherInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutTeacherInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => ClassCreateOrConnectWithoutTeacherInputObjectSchema), z.lazy(() => ClassCreateOrConnectWithoutTeacherInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => ClassUpsertWithWhereUniqueWithoutTeacherInputObjectSchema), z.lazy(() => ClassUpsertWithWhereUniqueWithoutTeacherInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => ClassCreateManyTeacherInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => ClassUpdateWithWhereUniqueWithoutTeacherInputObjectSchema), z.lazy(() => ClassUpdateWithWhereUniqueWithoutTeacherInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => ClassUpdateManyWithWhereWithoutTeacherInputObjectSchema), z.lazy(() => ClassUpdateManyWithWhereWithoutTeacherInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => ClassScalarWhereInputObjectSchema), z.lazy(() => ClassScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const ClassUncheckedUpdateManyWithoutTeacherNestedInputObjectSchema: z.ZodType<Prisma.ClassUncheckedUpdateManyWithoutTeacherNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUncheckedUpdateManyWithoutTeacherNestedInput>;
export const ClassUncheckedUpdateManyWithoutTeacherNestedInputObjectZodSchema = makeSchema();
