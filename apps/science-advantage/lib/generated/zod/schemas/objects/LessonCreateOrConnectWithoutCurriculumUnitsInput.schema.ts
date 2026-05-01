import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonCreateWithoutCurriculumUnitsInputObjectSchema as LessonCreateWithoutCurriculumUnitsInputObjectSchema } from './LessonCreateWithoutCurriculumUnitsInput.schema';
import { LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema as LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema } from './LessonUncheckedCreateWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => LessonCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema)])
}).strict();
export const LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.LessonCreateOrConnectWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateOrConnectWithoutCurriculumUnitsInput>;
export const LessonCreateOrConnectWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
