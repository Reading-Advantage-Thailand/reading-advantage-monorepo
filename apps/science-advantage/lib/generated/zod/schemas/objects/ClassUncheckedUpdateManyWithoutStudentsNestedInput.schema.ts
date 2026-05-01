import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateWithoutStudentsInputObjectSchema as ClassCreateWithoutStudentsInputObjectSchema } from './ClassCreateWithoutStudentsInput.schema';
import { ClassUncheckedCreateWithoutStudentsInputObjectSchema as ClassUncheckedCreateWithoutStudentsInputObjectSchema } from './ClassUncheckedCreateWithoutStudentsInput.schema';
import { ClassCreateOrConnectWithoutStudentsInputObjectSchema as ClassCreateOrConnectWithoutStudentsInputObjectSchema } from './ClassCreateOrConnectWithoutStudentsInput.schema';
import { ClassUpsertWithWhereUniqueWithoutStudentsInputObjectSchema as ClassUpsertWithWhereUniqueWithoutStudentsInputObjectSchema } from './ClassUpsertWithWhereUniqueWithoutStudentsInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassUpdateWithWhereUniqueWithoutStudentsInputObjectSchema as ClassUpdateWithWhereUniqueWithoutStudentsInputObjectSchema } from './ClassUpdateWithWhereUniqueWithoutStudentsInput.schema';
import { ClassUpdateManyWithWhereWithoutStudentsInputObjectSchema as ClassUpdateManyWithWhereWithoutStudentsInputObjectSchema } from './ClassUpdateManyWithWhereWithoutStudentsInput.schema';
import { ClassScalarWhereInputObjectSchema as ClassScalarWhereInputObjectSchema } from './ClassScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => ClassCreateWithoutStudentsInputObjectSchema), z.lazy(() => ClassCreateWithoutStudentsInputObjectSchema).array(), z.lazy(() => ClassUncheckedCreateWithoutStudentsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutStudentsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => ClassCreateOrConnectWithoutStudentsInputObjectSchema), z.lazy(() => ClassCreateOrConnectWithoutStudentsInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => ClassUpsertWithWhereUniqueWithoutStudentsInputObjectSchema), z.lazy(() => ClassUpsertWithWhereUniqueWithoutStudentsInputObjectSchema).array()]).optional(),
  set: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => ClassUpdateWithWhereUniqueWithoutStudentsInputObjectSchema), z.lazy(() => ClassUpdateWithWhereUniqueWithoutStudentsInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => ClassUpdateManyWithWhereWithoutStudentsInputObjectSchema), z.lazy(() => ClassUpdateManyWithWhereWithoutStudentsInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => ClassScalarWhereInputObjectSchema), z.lazy(() => ClassScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const ClassUncheckedUpdateManyWithoutStudentsNestedInputObjectSchema: z.ZodType<Prisma.ClassUncheckedUpdateManyWithoutStudentsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUncheckedUpdateManyWithoutStudentsNestedInput>;
export const ClassUncheckedUpdateManyWithoutStudentsNestedInputObjectZodSchema = makeSchema();
