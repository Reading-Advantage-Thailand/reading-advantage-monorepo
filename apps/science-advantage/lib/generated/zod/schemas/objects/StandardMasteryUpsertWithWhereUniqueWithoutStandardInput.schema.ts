import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryUpdateWithoutStandardInputObjectSchema as StandardMasteryUpdateWithoutStandardInputObjectSchema } from './StandardMasteryUpdateWithoutStandardInput.schema';
import { StandardMasteryUncheckedUpdateWithoutStandardInputObjectSchema as StandardMasteryUncheckedUpdateWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedUpdateWithoutStandardInput.schema';
import { StandardMasteryCreateWithoutStandardInputObjectSchema as StandardMasteryCreateWithoutStandardInputObjectSchema } from './StandardMasteryCreateWithoutStandardInput.schema';
import { StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema as StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedCreateWithoutStandardInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => StandardMasteryUpdateWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUncheckedUpdateWithoutStandardInputObjectSchema)]),
  create: z.union([z.lazy(() => StandardMasteryCreateWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema)])
}).strict();
export const StandardMasteryUpsertWithWhereUniqueWithoutStandardInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpsertWithWhereUniqueWithoutStandardInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpsertWithWhereUniqueWithoutStandardInput>;
export const StandardMasteryUpsertWithWhereUniqueWithoutStandardInputObjectZodSchema = makeSchema();
