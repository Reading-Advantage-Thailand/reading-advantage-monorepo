import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitUpdateWithoutLessonsInputObjectSchema as CurriculumUnitUpdateWithoutLessonsInputObjectSchema } from './CurriculumUnitUpdateWithoutLessonsInput.schema';
import { CurriculumUnitUncheckedUpdateWithoutLessonsInputObjectSchema as CurriculumUnitUncheckedUpdateWithoutLessonsInputObjectSchema } from './CurriculumUnitUncheckedUpdateWithoutLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => CurriculumUnitUpdateWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedUpdateWithoutLessonsInputObjectSchema)])
}).strict();
export const CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInput>;
export const CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInputObjectZodSchema = makeSchema();
