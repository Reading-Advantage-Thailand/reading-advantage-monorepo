import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitUpdateWithoutClassInputObjectSchema as CurriculumUnitUpdateWithoutClassInputObjectSchema } from './CurriculumUnitUpdateWithoutClassInput.schema';
import { CurriculumUnitUncheckedUpdateWithoutClassInputObjectSchema as CurriculumUnitUncheckedUpdateWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedUpdateWithoutClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => CurriculumUnitUpdateWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedUpdateWithoutClassInputObjectSchema)])
}).strict();
export const CurriculumUnitUpdateWithWhereUniqueWithoutClassInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUpdateWithWhereUniqueWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUpdateWithWhereUniqueWithoutClassInput>;
export const CurriculumUnitUpdateWithWhereUniqueWithoutClassInputObjectZodSchema = makeSchema();
