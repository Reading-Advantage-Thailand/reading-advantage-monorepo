import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitUpdateWithoutLessonsInputObjectSchema as CurriculumUnitUpdateWithoutLessonsInputObjectSchema } from './CurriculumUnitUpdateWithoutLessonsInput.schema';
import { CurriculumUnitUncheckedUpdateWithoutLessonsInputObjectSchema as CurriculumUnitUncheckedUpdateWithoutLessonsInputObjectSchema } from './CurriculumUnitUncheckedUpdateWithoutLessonsInput.schema';
import { CurriculumUnitCreateWithoutLessonsInputObjectSchema as CurriculumUnitCreateWithoutLessonsInputObjectSchema } from './CurriculumUnitCreateWithoutLessonsInput.schema';
import { CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema as CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema } from './CurriculumUnitUncheckedCreateWithoutLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => CurriculumUnitUpdateWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedUpdateWithoutLessonsInputObjectSchema)]),
  create: z.union([z.lazy(() => CurriculumUnitCreateWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema)])
}).strict();
export const CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInput>;
export const CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInputObjectZodSchema = makeSchema();
