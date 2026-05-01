import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassUpdateWithoutTeacherInputObjectSchema as ClassUpdateWithoutTeacherInputObjectSchema } from './ClassUpdateWithoutTeacherInput.schema';
import { ClassUncheckedUpdateWithoutTeacherInputObjectSchema as ClassUncheckedUpdateWithoutTeacherInputObjectSchema } from './ClassUncheckedUpdateWithoutTeacherInput.schema';
import { ClassCreateWithoutTeacherInputObjectSchema as ClassCreateWithoutTeacherInputObjectSchema } from './ClassCreateWithoutTeacherInput.schema';
import { ClassUncheckedCreateWithoutTeacherInputObjectSchema as ClassUncheckedCreateWithoutTeacherInputObjectSchema } from './ClassUncheckedCreateWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => ClassUpdateWithoutTeacherInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutTeacherInputObjectSchema)]),
  create: z.union([z.lazy(() => ClassCreateWithoutTeacherInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutTeacherInputObjectSchema)])
}).strict();
export const ClassUpsertWithWhereUniqueWithoutTeacherInputObjectSchema: z.ZodType<Prisma.ClassUpsertWithWhereUniqueWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpsertWithWhereUniqueWithoutTeacherInput>;
export const ClassUpsertWithWhereUniqueWithoutTeacherInputObjectZodSchema = makeSchema();
