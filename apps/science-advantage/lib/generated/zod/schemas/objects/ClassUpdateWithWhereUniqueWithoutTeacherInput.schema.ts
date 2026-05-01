import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassUpdateWithoutTeacherInputObjectSchema as ClassUpdateWithoutTeacherInputObjectSchema } from './ClassUpdateWithoutTeacherInput.schema';
import { ClassUncheckedUpdateWithoutTeacherInputObjectSchema as ClassUncheckedUpdateWithoutTeacherInputObjectSchema } from './ClassUncheckedUpdateWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => ClassUpdateWithoutTeacherInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutTeacherInputObjectSchema)])
}).strict();
export const ClassUpdateWithWhereUniqueWithoutTeacherInputObjectSchema: z.ZodType<Prisma.ClassUpdateWithWhereUniqueWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateWithWhereUniqueWithoutTeacherInput>;
export const ClassUpdateWithWhereUniqueWithoutTeacherInputObjectZodSchema = makeSchema();
