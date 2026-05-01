import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassUpdateWithoutAssignmentsInputObjectSchema as ClassUpdateWithoutAssignmentsInputObjectSchema } from './ClassUpdateWithoutAssignmentsInput.schema';
import { ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema as ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema } from './ClassUncheckedUpdateWithoutAssignmentsInput.schema';
import { ClassCreateWithoutAssignmentsInputObjectSchema as ClassCreateWithoutAssignmentsInputObjectSchema } from './ClassCreateWithoutAssignmentsInput.schema';
import { ClassUncheckedCreateWithoutAssignmentsInputObjectSchema as ClassUncheckedCreateWithoutAssignmentsInputObjectSchema } from './ClassUncheckedCreateWithoutAssignmentsInput.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './ClassWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => ClassUpdateWithoutAssignmentsInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema)]),
  create: z.union([z.lazy(() => ClassCreateWithoutAssignmentsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutAssignmentsInputObjectSchema)]),
  where: z.lazy(() => ClassWhereInputObjectSchema).optional()
}).strict();
export const ClassUpsertWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.ClassUpsertWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpsertWithoutAssignmentsInput>;
export const ClassUpsertWithoutAssignmentsInputObjectZodSchema = makeSchema();
