import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassCreateWithoutCurriculumUnitsInputObjectSchema as ClassCreateWithoutCurriculumUnitsInputObjectSchema } from './ClassCreateWithoutCurriculumUnitsInput.schema';
import { ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema as ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema } from './ClassUncheckedCreateWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => ClassCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema)])
}).strict();
export const ClassCreateOrConnectWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.ClassCreateOrConnectWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateOrConnectWithoutCurriculumUnitsInput>;
export const ClassCreateOrConnectWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
