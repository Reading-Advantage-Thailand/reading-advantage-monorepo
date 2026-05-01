import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateWithoutStudentsInputObjectSchema as ClassCreateWithoutStudentsInputObjectSchema } from './ClassCreateWithoutStudentsInput.schema';
import { ClassUncheckedCreateWithoutStudentsInputObjectSchema as ClassUncheckedCreateWithoutStudentsInputObjectSchema } from './ClassUncheckedCreateWithoutStudentsInput.schema';
import { ClassCreateOrConnectWithoutStudentsInputObjectSchema as ClassCreateOrConnectWithoutStudentsInputObjectSchema } from './ClassCreateOrConnectWithoutStudentsInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => ClassCreateWithoutStudentsInputObjectSchema), z.lazy(() => ClassCreateWithoutStudentsInputObjectSchema).array(), z.lazy(() => ClassUncheckedCreateWithoutStudentsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutStudentsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => ClassCreateOrConnectWithoutStudentsInputObjectSchema), z.lazy(() => ClassCreateOrConnectWithoutStudentsInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const ClassUncheckedCreateNestedManyWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassUncheckedCreateNestedManyWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUncheckedCreateNestedManyWithoutStudentsInput>;
export const ClassUncheckedCreateNestedManyWithoutStudentsInputObjectZodSchema = makeSchema();
