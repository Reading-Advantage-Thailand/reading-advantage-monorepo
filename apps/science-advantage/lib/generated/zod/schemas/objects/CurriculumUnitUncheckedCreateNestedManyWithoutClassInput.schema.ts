import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitCreateWithoutClassInputObjectSchema as CurriculumUnitCreateWithoutClassInputObjectSchema } from './CurriculumUnitCreateWithoutClassInput.schema';
import { CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema as CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedCreateWithoutClassInput.schema';
import { CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema as CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema } from './CurriculumUnitCreateOrConnectWithoutClassInput.schema';
import { CurriculumUnitCreateManyClassInputEnvelopeObjectSchema as CurriculumUnitCreateManyClassInputEnvelopeObjectSchema } from './CurriculumUnitCreateManyClassInputEnvelope.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => CurriculumUnitCreateWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitCreateWithoutClassInputObjectSchema).array(), z.lazy(() => CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => CurriculumUnitCreateManyClassInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUncheckedCreateNestedManyWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUncheckedCreateNestedManyWithoutClassInput>;
export const CurriculumUnitUncheckedCreateNestedManyWithoutClassInputObjectZodSchema = makeSchema();
