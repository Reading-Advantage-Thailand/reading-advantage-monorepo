import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitCreateWithoutLessonsInputObjectSchema as CurriculumUnitCreateWithoutLessonsInputObjectSchema } from './CurriculumUnitCreateWithoutLessonsInput.schema';
import { CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema as CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema } from './CurriculumUnitUncheckedCreateWithoutLessonsInput.schema';
import { CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema as CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema } from './CurriculumUnitCreateOrConnectWithoutLessonsInput.schema';
import { CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInputObjectSchema as CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInputObjectSchema } from './CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInput.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInputObjectSchema as CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInputObjectSchema } from './CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInput.schema';
import { CurriculumUnitUpdateManyWithWhereWithoutLessonsInputObjectSchema as CurriculumUnitUpdateManyWithWhereWithoutLessonsInputObjectSchema } from './CurriculumUnitUpdateManyWithWhereWithoutLessonsInput.schema';
import { CurriculumUnitScalarWhereInputObjectSchema as CurriculumUnitScalarWhereInputObjectSchema } from './CurriculumUnitScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => CurriculumUnitCreateWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitCreateWithoutLessonsInputObjectSchema).array(), z.lazy(() => CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUpsertWithWhereUniqueWithoutLessonsInputObjectSchema).array()]).optional(),
  set: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUpdateWithWhereUniqueWithoutLessonsInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => CurriculumUnitUpdateManyWithWhereWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUpdateManyWithWhereWithoutLessonsInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema), z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const CurriculumUnitUncheckedUpdateManyWithoutLessonsNestedInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUncheckedUpdateManyWithoutLessonsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUncheckedUpdateManyWithoutLessonsNestedInput>;
export const CurriculumUnitUncheckedUpdateManyWithoutLessonsNestedInputObjectZodSchema = makeSchema();
