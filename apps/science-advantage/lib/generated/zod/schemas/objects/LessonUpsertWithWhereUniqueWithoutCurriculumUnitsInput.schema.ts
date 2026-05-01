import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateWithoutCurriculumUnitsInputObjectSchema as LessonUpdateWithoutCurriculumUnitsInputObjectSchema } from './LessonUpdateWithoutCurriculumUnitsInput.schema';
import { LessonUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema as LessonUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema } from './LessonUncheckedUpdateWithoutCurriculumUnitsInput.schema';
import { LessonCreateWithoutCurriculumUnitsInputObjectSchema as LessonCreateWithoutCurriculumUnitsInputObjectSchema } from './LessonCreateWithoutCurriculumUnitsInput.schema';
import { LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema as LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema } from './LessonUncheckedCreateWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => LessonUpdateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema)]),
  create: z.union([z.lazy(() => LessonCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema)])
}).strict();
export const LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInput>;
export const LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
