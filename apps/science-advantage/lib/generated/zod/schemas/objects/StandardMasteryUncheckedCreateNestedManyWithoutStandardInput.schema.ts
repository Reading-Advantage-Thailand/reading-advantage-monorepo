import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryCreateWithoutStandardInputObjectSchema as StandardMasteryCreateWithoutStandardInputObjectSchema } from './StandardMasteryCreateWithoutStandardInput.schema';
import { StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema as StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedCreateWithoutStandardInput.schema';
import { StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema as StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema } from './StandardMasteryCreateOrConnectWithoutStandardInput.schema';
import { StandardMasteryCreateManyStandardInputEnvelopeObjectSchema as StandardMasteryCreateManyStandardInputEnvelopeObjectSchema } from './StandardMasteryCreateManyStandardInputEnvelope.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardMasteryCreateWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryCreateWithoutStandardInputObjectSchema).array(), z.lazy(() => StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => StandardMasteryCreateManyStandardInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema: z.ZodType<Prisma.StandardMasteryUncheckedCreateNestedManyWithoutStandardInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUncheckedCreateNestedManyWithoutStandardInput>;
export const StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectZodSchema = makeSchema();
