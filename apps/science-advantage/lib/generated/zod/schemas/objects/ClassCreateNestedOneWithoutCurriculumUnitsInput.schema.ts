import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateWithoutCurriculumUnitsInputObjectSchema as ClassCreateWithoutCurriculumUnitsInputObjectSchema } from './ClassCreateWithoutCurriculumUnitsInput.schema';
import { ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema as ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema } from './ClassUncheckedCreateWithoutCurriculumUnitsInput.schema';
import { ClassCreateOrConnectWithoutCurriculumUnitsInputObjectSchema as ClassCreateOrConnectWithoutCurriculumUnitsInputObjectSchema } from './ClassCreateOrConnectWithoutCurriculumUnitsInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => ClassCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => ClassCreateOrConnectWithoutCurriculumUnitsInputObjectSchema).optional(),
  connect: z.lazy(() => ClassWhereUniqueInputObjectSchema).optional()
}).strict();
export const ClassCreateNestedOneWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.ClassCreateNestedOneWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateNestedOneWithoutCurriculumUnitsInput>;
export const ClassCreateNestedOneWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
