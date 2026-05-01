import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassUpdateWithoutCurriculumUnitsInputObjectSchema as ClassUpdateWithoutCurriculumUnitsInputObjectSchema } from './ClassUpdateWithoutCurriculumUnitsInput.schema';
import { ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema as ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema } from './ClassUncheckedUpdateWithoutCurriculumUnitsInput.schema';
import { ClassCreateWithoutCurriculumUnitsInputObjectSchema as ClassCreateWithoutCurriculumUnitsInputObjectSchema } from './ClassCreateWithoutCurriculumUnitsInput.schema';
import { ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema as ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema } from './ClassUncheckedCreateWithoutCurriculumUnitsInput.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './ClassWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => ClassUpdateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema)]),
  create: z.union([z.lazy(() => ClassCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema)]),
  where: z.lazy(() => ClassWhereInputObjectSchema).optional()
}).strict();
export const ClassUpsertWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.ClassUpsertWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpsertWithoutCurriculumUnitsInput>;
export const ClassUpsertWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
