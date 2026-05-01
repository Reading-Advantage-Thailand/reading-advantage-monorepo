import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateWithoutAssignmentsInputObjectSchema as ClassCreateWithoutAssignmentsInputObjectSchema } from './ClassCreateWithoutAssignmentsInput.schema';
import { ClassUncheckedCreateWithoutAssignmentsInputObjectSchema as ClassUncheckedCreateWithoutAssignmentsInputObjectSchema } from './ClassUncheckedCreateWithoutAssignmentsInput.schema';
import { ClassCreateOrConnectWithoutAssignmentsInputObjectSchema as ClassCreateOrConnectWithoutAssignmentsInputObjectSchema } from './ClassCreateOrConnectWithoutAssignmentsInput.schema';
import { ClassUpsertWithoutAssignmentsInputObjectSchema as ClassUpsertWithoutAssignmentsInputObjectSchema } from './ClassUpsertWithoutAssignmentsInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassUpdateToOneWithWhereWithoutAssignmentsInputObjectSchema as ClassUpdateToOneWithWhereWithoutAssignmentsInputObjectSchema } from './ClassUpdateToOneWithWhereWithoutAssignmentsInput.schema';
import { ClassUpdateWithoutAssignmentsInputObjectSchema as ClassUpdateWithoutAssignmentsInputObjectSchema } from './ClassUpdateWithoutAssignmentsInput.schema';
import { ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema as ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema } from './ClassUncheckedUpdateWithoutAssignmentsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => ClassCreateWithoutAssignmentsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutAssignmentsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => ClassCreateOrConnectWithoutAssignmentsInputObjectSchema).optional(),
  upsert: z.lazy(() => ClassUpsertWithoutAssignmentsInputObjectSchema).optional(),
  connect: z.lazy(() => ClassWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => ClassUpdateToOneWithWhereWithoutAssignmentsInputObjectSchema), z.lazy(() => ClassUpdateWithoutAssignmentsInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema)]).optional()
}).strict();
export const ClassUpdateOneRequiredWithoutAssignmentsNestedInputObjectSchema: z.ZodType<Prisma.ClassUpdateOneRequiredWithoutAssignmentsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateOneRequiredWithoutAssignmentsNestedInput>;
export const ClassUpdateOneRequiredWithoutAssignmentsNestedInputObjectZodSchema = makeSchema();
