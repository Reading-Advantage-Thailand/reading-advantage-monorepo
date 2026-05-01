import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutCurriculumUnitsInputObjectSchema as LessonCreateWithoutCurriculumUnitsInputObjectSchema } from './LessonCreateWithoutCurriculumUnitsInput.schema';
import { LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema as LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema } from './LessonUncheckedCreateWithoutCurriculumUnitsInput.schema';
import { LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema as LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema } from './LessonCreateOrConnectWithoutCurriculumUnitsInput.schema';
import { LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema as LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema } from './LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema as LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema } from './LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInput.schema';
import { LessonUpdateManyWithWhereWithoutCurriculumUnitsInputObjectSchema as LessonUpdateManyWithWhereWithoutCurriculumUnitsInputObjectSchema } from './LessonUpdateManyWithWhereWithoutCurriculumUnitsInput.schema';
import { LessonScalarWhereInputObjectSchema as LessonScalarWhereInputObjectSchema } from './LessonScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonCreateWithoutCurriculumUnitsInputObjectSchema).array(), z.lazy(() => LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutCurriculumUnitsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonCreateOrConnectWithoutCurriculumUnitsInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUpsertWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema).array()]).optional(),
  set: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => LessonWhereUniqueInputObjectSchema), z.lazy(() => LessonWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUpdateWithWhereUniqueWithoutCurriculumUnitsInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => LessonUpdateManyWithWhereWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => LessonUpdateManyWithWhereWithoutCurriculumUnitsInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => LessonScalarWhereInputObjectSchema), z.lazy(() => LessonScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const LessonUncheckedUpdateManyWithoutCurriculumUnitsNestedInputObjectSchema: z.ZodType<Prisma.LessonUncheckedUpdateManyWithoutCurriculumUnitsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUncheckedUpdateManyWithoutCurriculumUnitsNestedInput>;
export const LessonUncheckedUpdateManyWithoutCurriculumUnitsNestedInputObjectZodSchema = makeSchema();
