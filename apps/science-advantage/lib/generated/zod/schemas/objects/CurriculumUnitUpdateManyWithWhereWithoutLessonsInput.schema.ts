import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitScalarWhereInputObjectSchema as CurriculumUnitScalarWhereInputObjectSchema } from './CurriculumUnitScalarWhereInput.schema';
import { CurriculumUnitUpdateManyMutationInputObjectSchema as CurriculumUnitUpdateManyMutationInputObjectSchema } from './CurriculumUnitUpdateManyMutationInput.schema';
import { CurriculumUnitUncheckedUpdateManyWithoutLessonsInputObjectSchema as CurriculumUnitUncheckedUpdateManyWithoutLessonsInputObjectSchema } from './CurriculumUnitUncheckedUpdateManyWithoutLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => CurriculumUnitUpdateManyMutationInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedUpdateManyWithoutLessonsInputObjectSchema)])
}).strict();
export const CurriculumUnitUpdateManyWithWhereWithoutLessonsInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUpdateManyWithWhereWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUpdateManyWithWhereWithoutLessonsInput>;
export const CurriculumUnitUpdateManyWithWhereWithoutLessonsInputObjectZodSchema = makeSchema();
