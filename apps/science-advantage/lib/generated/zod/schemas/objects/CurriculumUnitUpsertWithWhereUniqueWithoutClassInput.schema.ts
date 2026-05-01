import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitUpdateWithoutClassInputObjectSchema as CurriculumUnitUpdateWithoutClassInputObjectSchema } from './CurriculumUnitUpdateWithoutClassInput.schema';
import { CurriculumUnitUncheckedUpdateWithoutClassInputObjectSchema as CurriculumUnitUncheckedUpdateWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedUpdateWithoutClassInput.schema';
import { CurriculumUnitCreateWithoutClassInputObjectSchema as CurriculumUnitCreateWithoutClassInputObjectSchema } from './CurriculumUnitCreateWithoutClassInput.schema';
import { CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema as CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedCreateWithoutClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => CurriculumUnitUpdateWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedUpdateWithoutClassInputObjectSchema)]),
  create: z.union([z.lazy(() => CurriculumUnitCreateWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema)])
}).strict();
export const CurriculumUnitUpsertWithWhereUniqueWithoutClassInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUpsertWithWhereUniqueWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUpsertWithWhereUniqueWithoutClassInput>;
export const CurriculumUnitUpsertWithWhereUniqueWithoutClassInputObjectZodSchema = makeSchema();
