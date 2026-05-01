import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './ClassWhereInput.schema';
import { ClassUpdateWithoutCurriculumUnitsInputObjectSchema as ClassUpdateWithoutCurriculumUnitsInputObjectSchema } from './ClassUpdateWithoutCurriculumUnitsInput.schema';
import { ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema as ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema } from './ClassUncheckedUpdateWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => ClassUpdateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema)])
}).strict();
export const ClassUpdateToOneWithWhereWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.ClassUpdateToOneWithWhereWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateToOneWithWhereWithoutCurriculumUnitsInput>;
export const ClassUpdateToOneWithWhereWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
