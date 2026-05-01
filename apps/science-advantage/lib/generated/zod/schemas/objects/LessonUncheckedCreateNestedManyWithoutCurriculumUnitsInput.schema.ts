import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutCurriculumUnitsInputObjectSchema as LessonCreateWithoutCurriculumUnitsInputObjectSchema } from './LessonCreateWithoutCurriculumUnitsInput.schema';
import { LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema as LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema } from './LessonUncheckedCreateWithoutCurriculumUnitsInput.schema';
import { LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema as LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema } from './LessonCreateOrConnectWithoutCurriculumUnitsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonCreateWithoutCurriculumUnitsInputObjectSchema).array(), z.lazy(() => LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const LessonUncheckedCreateNestedManyWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.LessonUncheckedCreateNestedManyWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUncheckedCreateNestedManyWithoutCurriculumUnitsInput>;
export const LessonUncheckedCreateNestedManyWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
