import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitCreateWithoutClassInputObjectSchema as CurriculumUnitCreateWithoutClassInputObjectSchema } from './CurriculumUnitCreateWithoutClassInput.schema';
import { CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema as CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedCreateWithoutClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => CurriculumUnitCreateWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema)])
}).strict();
export const CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema: z.ZodType<Prisma.CurriculumUnitCreateOrConnectWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitCreateOrConnectWithoutClassInput>;
export const CurriculumUnitCreateOrConnectWithoutClassInputObjectZodSchema = makeSchema();
