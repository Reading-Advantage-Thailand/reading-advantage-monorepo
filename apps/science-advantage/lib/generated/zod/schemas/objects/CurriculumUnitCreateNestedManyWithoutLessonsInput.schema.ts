import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitCreateWithoutLessonsInputObjectSchema as CurriculumUnitCreateWithoutLessonsInputObjectSchema } from './CurriculumUnitCreateWithoutLessonsInput.schema';
import { CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema as CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema } from './CurriculumUnitUncheckedCreateWithoutLessonsInput.schema';
import { CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema as CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema } from './CurriculumUnitCreateOrConnectWithoutLessonsInput.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => CurriculumUnitCreateWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitCreateWithoutLessonsInputObjectSchema).array(), z.lazy(() => CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const CurriculumUnitCreateNestedManyWithoutLessonsInputObjectSchema: z.ZodType<Prisma.CurriculumUnitCreateNestedManyWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitCreateNestedManyWithoutLessonsInput>;
export const CurriculumUnitCreateNestedManyWithoutLessonsInputObjectZodSchema = makeSchema();
