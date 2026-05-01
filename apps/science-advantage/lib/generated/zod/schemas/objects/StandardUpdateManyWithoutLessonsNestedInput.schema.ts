import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardCreateWithoutLessonsInputObjectSchema as StandardCreateWithoutLessonsInputObjectSchema } from './StandardCreateWithoutLessonsInput.schema';
import { StandardUncheckedCreateWithoutLessonsInputObjectSchema as StandardUncheckedCreateWithoutLessonsInputObjectSchema } from './StandardUncheckedCreateWithoutLessonsInput.schema';
import { StandardCreateOrConnectWithoutLessonsInputObjectSchema as StandardCreateOrConnectWithoutLessonsInputObjectSchema } from './StandardCreateOrConnectWithoutLessonsInput.schema';
import { StandardUpsertWithWhereUniqueWithoutLessonsInputObjectSchema as StandardUpsertWithWhereUniqueWithoutLessonsInputObjectSchema } from './StandardUpsertWithWhereUniqueWithoutLessonsInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardUpdateWithWhereUniqueWithoutLessonsInputObjectSchema as StandardUpdateWithWhereUniqueWithoutLessonsInputObjectSchema } from './StandardUpdateWithWhereUniqueWithoutLessonsInput.schema';
import { StandardUpdateManyWithWhereWithoutLessonsInputObjectSchema as StandardUpdateManyWithWhereWithoutLessonsInputObjectSchema } from './StandardUpdateManyWithWhereWithoutLessonsInput.schema';
import { StandardScalarWhereInputObjectSchema as StandardScalarWhereInputObjectSchema } from './StandardScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardCreateWithoutLessonsInputObjectSchema), z.lazy(() => StandardCreateWithoutLessonsInputObjectSchema).array(), z.lazy(() => StandardUncheckedCreateWithoutLessonsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutLessonsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => StandardCreateOrConnectWithoutLessonsInputObjectSchema), z.lazy(() => StandardCreateOrConnectWithoutLessonsInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => StandardUpsertWithWhereUniqueWithoutLessonsInputObjectSchema), z.lazy(() => StandardUpsertWithWhereUniqueWithoutLessonsInputObjectSchema).array()]).optional(),
  set: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => StandardUpdateWithWhereUniqueWithoutLessonsInputObjectSchema), z.lazy(() => StandardUpdateWithWhereUniqueWithoutLessonsInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => StandardUpdateManyWithWhereWithoutLessonsInputObjectSchema), z.lazy(() => StandardUpdateManyWithWhereWithoutLessonsInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => StandardScalarWhereInputObjectSchema), z.lazy(() => StandardScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const StandardUpdateManyWithoutLessonsNestedInputObjectSchema: z.ZodType<Prisma.StandardUpdateManyWithoutLessonsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateManyWithoutLessonsNestedInput>;
export const StandardUpdateManyWithoutLessonsNestedInputObjectZodSchema = makeSchema();
