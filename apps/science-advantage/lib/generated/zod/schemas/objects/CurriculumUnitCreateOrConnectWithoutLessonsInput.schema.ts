import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitCreateWithoutLessonsInputObjectSchema as CurriculumUnitCreateWithoutLessonsInputObjectSchema } from './CurriculumUnitCreateWithoutLessonsInput.schema';
import { CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema as CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema } from './CurriculumUnitUncheckedCreateWithoutLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => CurriculumUnitCreateWithoutLessonsInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedCreateWithoutLessonsInputObjectSchema)])
}).strict();
export const CurriculumUnitCreateOrConnectWithoutLessonsInputObjectSchema: z.ZodType<Prisma.CurriculumUnitCreateOrConnectWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitCreateOrConnectWithoutLessonsInput>;
export const CurriculumUnitCreateOrConnectWithoutLessonsInputObjectZodSchema = makeSchema();
