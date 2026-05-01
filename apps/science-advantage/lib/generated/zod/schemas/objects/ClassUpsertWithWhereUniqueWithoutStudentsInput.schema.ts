import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassUpdateWithoutStudentsInputObjectSchema as ClassUpdateWithoutStudentsInputObjectSchema } from './ClassUpdateWithoutStudentsInput.schema';
import { ClassUncheckedUpdateWithoutStudentsInputObjectSchema as ClassUncheckedUpdateWithoutStudentsInputObjectSchema } from './ClassUncheckedUpdateWithoutStudentsInput.schema';
import { ClassCreateWithoutStudentsInputObjectSchema as ClassCreateWithoutStudentsInputObjectSchema } from './ClassCreateWithoutStudentsInput.schema';
import { ClassUncheckedCreateWithoutStudentsInputObjectSchema as ClassUncheckedCreateWithoutStudentsInputObjectSchema } from './ClassUncheckedCreateWithoutStudentsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => ClassUpdateWithoutStudentsInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutStudentsInputObjectSchema)]),
  create: z.union([z.lazy(() => ClassCreateWithoutStudentsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutStudentsInputObjectSchema)])
}).strict();
export const ClassUpsertWithWhereUniqueWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassUpsertWithWhereUniqueWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpsertWithWhereUniqueWithoutStudentsInput>;
export const ClassUpsertWithWhereUniqueWithoutStudentsInputObjectZodSchema = makeSchema();
