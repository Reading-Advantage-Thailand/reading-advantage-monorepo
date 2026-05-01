import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateWithoutAssignmentsInputObjectSchema as ClassCreateWithoutAssignmentsInputObjectSchema } from './ClassCreateWithoutAssignmentsInput.schema';
import { ClassUncheckedCreateWithoutAssignmentsInputObjectSchema as ClassUncheckedCreateWithoutAssignmentsInputObjectSchema } from './ClassUncheckedCreateWithoutAssignmentsInput.schema';
import { ClassCreateOrConnectWithoutAssignmentsInputObjectSchema as ClassCreateOrConnectWithoutAssignmentsInputObjectSchema } from './ClassCreateOrConnectWithoutAssignmentsInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => ClassCreateWithoutAssignmentsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutAssignmentsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => ClassCreateOrConnectWithoutAssignmentsInputObjectSchema).optional(),
  connect: z.lazy(() => ClassWhereUniqueInputObjectSchema).optional()
}).strict();
export const ClassCreateNestedOneWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.ClassCreateNestedOneWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateNestedOneWithoutAssignmentsInput>;
export const ClassCreateNestedOneWithoutAssignmentsInputObjectZodSchema = makeSchema();
