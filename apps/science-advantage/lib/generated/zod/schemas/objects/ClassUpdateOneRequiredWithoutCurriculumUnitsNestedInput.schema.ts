import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateWithoutCurriculumUnitsInputObjectSchema as ClassCreateWithoutCurriculumUnitsInputObjectSchema } from './ClassCreateWithoutCurriculumUnitsInput.schema';
import { ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema as ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema } from './ClassUncheckedCreateWithoutCurriculumUnitsInput.schema';
import { ClassCreateOrConnectWithoutCurriculumUnitsInputObjectSchema as ClassCreateOrConnectWithoutCurriculumUnitsInputObjectSchema } from './ClassCreateOrConnectWithoutCurriculumUnitsInput.schema';
import { ClassUpsertWithoutCurriculumUnitsInputObjectSchema as ClassUpsertWithoutCurriculumUnitsInputObjectSchema } from './ClassUpsertWithoutCurriculumUnitsInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassUpdateToOneWithWhereWithoutCurriculumUnitsInputObjectSchema as ClassUpdateToOneWithWhereWithoutCurriculumUnitsInputObjectSchema } from './ClassUpdateToOneWithWhereWithoutCurriculumUnitsInput.schema';
import { ClassUpdateWithoutCurriculumUnitsInputObjectSchema as ClassUpdateWithoutCurriculumUnitsInputObjectSchema } from './ClassUpdateWithoutCurriculumUnitsInput.schema';
import { ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema as ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema } from './ClassUncheckedUpdateWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => ClassCreateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutCurriculumUnitsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => ClassCreateOrConnectWithoutCurriculumUnitsInputObjectSchema).optional(),
  upsert: z.lazy(() => ClassUpsertWithoutCurriculumUnitsInputObjectSchema).optional(),
  connect: z.lazy(() => ClassWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => ClassUpdateToOneWithWhereWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => ClassUpdateWithoutCurriculumUnitsInputObjectSchema), z.lazy(() => ClassUncheckedUpdateWithoutCurriculumUnitsInputObjectSchema)]).optional()
}).strict();
export const ClassUpdateOneRequiredWithoutCurriculumUnitsNestedInputObjectSchema: z.ZodType<Prisma.ClassUpdateOneRequiredWithoutCurriculumUnitsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateOneRequiredWithoutCurriculumUnitsNestedInput>;
export const ClassUpdateOneRequiredWithoutCurriculumUnitsNestedInputObjectZodSchema = makeSchema();
