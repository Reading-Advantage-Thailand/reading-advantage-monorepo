import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassCreateWithoutAssignmentsInputObjectSchema as ClassCreateWithoutAssignmentsInputObjectSchema } from './ClassCreateWithoutAssignmentsInput.schema';
import { ClassUncheckedCreateWithoutAssignmentsInputObjectSchema as ClassUncheckedCreateWithoutAssignmentsInputObjectSchema } from './ClassUncheckedCreateWithoutAssignmentsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => ClassCreateWithoutAssignmentsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutAssignmentsInputObjectSchema)])
}).strict();
export const ClassCreateOrConnectWithoutAssignmentsInputObjectSchema: z.ZodType<Prisma.ClassCreateOrConnectWithoutAssignmentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateOrConnectWithoutAssignmentsInput>;
export const ClassCreateOrConnectWithoutAssignmentsInputObjectZodSchema = makeSchema();
