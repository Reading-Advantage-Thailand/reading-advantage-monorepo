import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryCreateWithoutStandardInputObjectSchema as StandardMasteryCreateWithoutStandardInputObjectSchema } from './StandardMasteryCreateWithoutStandardInput.schema';
import { StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema as StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedCreateWithoutStandardInput.schema';
import { StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema as StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema } from './StandardMasteryCreateOrConnectWithoutStandardInput.schema';
import { StandardMasteryUpsertWithWhereUniqueWithoutStandardInputObjectSchema as StandardMasteryUpsertWithWhereUniqueWithoutStandardInputObjectSchema } from './StandardMasteryUpsertWithWhereUniqueWithoutStandardInput.schema';
import { StandardMasteryCreateManyStandardInputEnvelopeObjectSchema as StandardMasteryCreateManyStandardInputEnvelopeObjectSchema } from './StandardMasteryCreateManyStandardInputEnvelope.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryUpdateWithWhereUniqueWithoutStandardInputObjectSchema as StandardMasteryUpdateWithWhereUniqueWithoutStandardInputObjectSchema } from './StandardMasteryUpdateWithWhereUniqueWithoutStandardInput.schema';
import { StandardMasteryUpdateManyWithWhereWithoutStandardInputObjectSchema as StandardMasteryUpdateManyWithWhereWithoutStandardInputObjectSchema } from './StandardMasteryUpdateManyWithWhereWithoutStandardInput.schema';
import { StandardMasteryScalarWhereInputObjectSchema as StandardMasteryScalarWhereInputObjectSchema } from './StandardMasteryScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardMasteryCreateWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryCreateWithoutStandardInputObjectSchema).array(), z.lazy(() => StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => StandardMasteryUpsertWithWhereUniqueWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUpsertWithWhereUniqueWithoutStandardInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => StandardMasteryCreateManyStandardInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => StandardMasteryUpdateWithWhereUniqueWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUpdateWithWhereUniqueWithoutStandardInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => StandardMasteryUpdateManyWithWhereWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUpdateManyWithWhereWithoutStandardInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => StandardMasteryScalarWhereInputObjectSchema), z.lazy(() => StandardMasteryScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const StandardMasteryUpdateManyWithoutStandardNestedInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpdateManyWithoutStandardNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpdateManyWithoutStandardNestedInput>;
export const StandardMasteryUpdateManyWithoutStandardNestedInputObjectZodSchema = makeSchema();
