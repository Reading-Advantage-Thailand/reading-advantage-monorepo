import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassUpdateWithoutStudentsInputObjectSchema as ClassUpdateWithoutStudentsInputObjectSchema } from './ClassUpdateWithoutStudentsInput.schema';
import { ClassUncheckedUpdateWithoutStudentsInputObjectSchema as ClassUncheckedUpdateWithoutStudentsInputObjectSchema } from './ClassUncheckedUpdateWithoutStudentsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => ClassUpdateWithoutStudentsInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutStudentsInputObjectSchema)])
}).strict();
export const ClassUpdateWithWhereUniqueWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassUpdateWithWhereUniqueWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateWithWhereUniqueWithoutStudentsInput>;
export const ClassUpdateWithWhereUniqueWithoutStudentsInputObjectZodSchema = makeSchema();
