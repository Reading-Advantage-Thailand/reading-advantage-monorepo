import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonScalarWhereInputObjectSchema as LessonScalarWhereInputObjectSchema } from './LessonScalarWhereInput.schema';
import { LessonUpdateManyMutationInputObjectSchema as LessonUpdateManyMutationInputObjectSchema } from './LessonUpdateManyMutationInput.schema';
import { LessonUncheckedUpdateManyWithoutCurriculumUnitsInputObjectSchema as LessonUncheckedUpdateManyWithoutCurriculumUnitsInputObjectSchema } from './LessonUncheckedUpdateManyWithoutCurriculumUnitsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => LessonUpdateManyMutationInputObjectSchema), z.lazy(() => LessonUncheckedUpdateManyWithoutCurriculumUnitsInputObjectSchema)])
}).strict();
export const LessonUpdateManyWithWhereWithoutCurriculumUnitsInputObjectSchema: z.ZodType<Prisma.LessonUpdateManyWithWhereWithoutCurriculumUnitsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateManyWithWhereWithoutCurriculumUnitsInput>;
export const LessonUpdateManyWithWhereWithoutCurriculumUnitsInputObjectZodSchema = makeSchema();
