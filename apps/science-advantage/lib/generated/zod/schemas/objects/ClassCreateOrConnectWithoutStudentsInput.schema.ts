import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassCreateWithoutStudentsInputObjectSchema as ClassCreateWithoutStudentsInputObjectSchema } from './ClassCreateWithoutStudentsInput.schema';
import { ClassUncheckedCreateWithoutStudentsInputObjectSchema as ClassUncheckedCreateWithoutStudentsInputObjectSchema } from './ClassUncheckedCreateWithoutStudentsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => ClassCreateWithoutStudentsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutStudentsInputObjectSchema)])
}).strict();
export const ClassCreateOrConnectWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassCreateOrConnectWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateOrConnectWithoutStudentsInput>;
export const ClassCreateOrConnectWithoutStudentsInputObjectZodSchema = makeSchema();
