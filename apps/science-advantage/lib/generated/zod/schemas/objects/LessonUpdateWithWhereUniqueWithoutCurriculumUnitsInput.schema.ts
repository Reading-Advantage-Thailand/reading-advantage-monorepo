import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateWithoutCurriculumUnitsInputObjectSchema as LessonUpdateWithoutCurriculumUnitsInputObjectSchema } from './LessonUpdateWithoutCurriculumUnitsInput.schema';
import { LessonUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema as LessonUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema } from './LessonUncheckedUpdateWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => LessonUpdateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema)])
}).strict();
export const LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInput>;
export const LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
