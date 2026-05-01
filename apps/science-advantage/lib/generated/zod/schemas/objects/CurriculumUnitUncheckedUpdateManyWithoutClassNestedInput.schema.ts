import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitCreateWithoutClassInputObjectSchema as CurriculumUnitCreateWithoutClassInputObjectSchema } from './CurriculumUnitCreateWithoutClassInput.schema';
import { CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema as CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema } from './CurriculumUnitUncheckedCreateWithoutClassInput.schema';
import { CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema as CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema } from './CurriculumUnitCreateOrConnectWithoutClassInput.schema';
import { CurriculumUnitUpsertWithWhereUniqueWithoutClassInputObjectSchema as CurriculumUnitUpsertWithWhereUniqueWithoutClassInputObjectSchema } from './CurriculumUnitUpsertWithWhereUniqueWithoutClassInput.schema';
import { CurriculumUnitCreateManyClassInputEnvelopeObjectSchema as CurriculumUnitCreateManyClassInputEnvelopeObjectSchema } from './CurriculumUnitCreateManyClassInputEnvelope.schema';
import { CurriculumUnitWhereUniqueInputObjectSchema as CurriculumUnitWhereUniqueInputObjectSchema } from './CurriculumUnitWhereUniqueInput.schema';
import { CurriculumUnitUpdateWithWhereUniqueWithoutClassInputObjectSchema as CurriculumUnitUpdateWithWhereUniqueWithoutClassInputObjectSchema } from './CurriculumUnitUpdateWithWhereUniqueWithoutClassInput.schema';
import { CurriculumUnitUpdateManyWithWhereWithoutClassInputObjectSchema as CurriculumUnitUpdateManyWithWhereWithoutClassInputObjectSchema } from './CurriculumUnitUpdateManyWithWhereWithoutClassInput.schema';
import { CurriculumUnitScalarWhereInputObjectSchema as CurriculumUnitScalarWhereInputObjectSchema } from './CurriculumUnitScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => CurriculumUnitCreateWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitCreateWithoutClassInputObjectSchema).array(), z.lazy(() => CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUncheckedCreateWithoutClassInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitCreateOrConnectWithoutClassInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => CurriculumUnitUpsertWithWhereUniqueWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUpsertWithWhereUniqueWithoutClassInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => CurriculumUnitCreateManyClassInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema), z.lazy(() => CurriculumUnitWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => CurriculumUnitUpdateWithWhereUniqueWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUpdateWithWhereUniqueWithoutClassInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => CurriculumUnitUpdateManyWithWhereWithoutClassInputObjectSchema), z.lazy(() => CurriculumUnitUpdateManyWithWhereWithoutClassInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema), z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const CurriculumUnitUncheckedUpdateManyWithoutClassNestedInputObjectSchema: z.ZodType<Prisma.CurriculumUnitUncheckedUpdateManyWithoutClassNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitUncheckedUpdateManyWithoutClassNestedInput>;
export const CurriculumUnitUncheckedUpdateManyWithoutClassNestedInputObjectZodSchema = makeSchema();
