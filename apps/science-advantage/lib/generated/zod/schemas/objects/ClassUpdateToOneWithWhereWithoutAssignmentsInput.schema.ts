import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './ClassWhereInput.schema';
import { ClassUpdateWithoutAssignmentsInputObjectSchema as ClassUpdateWithoutAssignmentsInputObjectSchema } from './ClassUpdateWithoutAssignmentsInput.schema';
import { ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema as ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema } from './ClassUncheckedUpdateWithoutAssignmentsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => ClassUpdateWithoutAssignmentsInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutAssignmentsInputObjectSchema)])
}).strict();
export const ClassUpdateToOneWithWhereWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.ClassUpdateToOneWithWhereWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateToOneWithWhereWithoutAssignmentsInput>;
export const ClassUpdateToOneWithWhereWithoutAssignmentsInputObjectZodSchema = makeSchema();
