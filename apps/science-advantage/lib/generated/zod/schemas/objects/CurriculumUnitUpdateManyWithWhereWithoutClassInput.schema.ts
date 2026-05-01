import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitScalarWhereInputObjectSchema as CurriculumUnitScalarWhereInputObjectSchema } from './CurriculumUnitScalarWhereInput.schema';
import { CurriculumUnitUpdateManyMutationInputObjectSchema as CurriculumUnitUpdateManyMutationInputObjectSchema } from './CurriculumUnitUpdateManyMutationInput.schema';
import { CurriculumUnitUncheckedUpdateManyWithoutClassInputObjectSchema as CurriculumUnitUncheckedUpdateManyWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedUpdateManyWithoutClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => CurriculumUnitUpdateManyMutationInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedUpdateManyWithoutClassInputObjectSchema)])
}).strict();
export const CurriculumUnitUpdateManyWithWhereWithoutClassInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUpdateManyWithWhereWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUpdateManyWithWhereWithoutClassInput>;
export const CurriculumUnitUpdateManyWithWhereWithoutClassInputObjectZodSchema = makeSchema();
