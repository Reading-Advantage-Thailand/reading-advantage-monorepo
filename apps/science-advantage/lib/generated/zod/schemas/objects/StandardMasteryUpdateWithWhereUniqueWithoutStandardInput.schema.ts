import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryUpdateWithoutStandardInputObjectSchema as StandardMasteryUpdateWithoutStandardInputObjectSchema } from './StandardMasteryUpdateWithoutStandardInput.schema';
import { StandardMasteryUncheckedUpdateWithoutStandardInputObjectSchema as StandardMasteryUncheckedUpdateWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedUpdateWithoutStandardInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => StandardMasteryUpdateWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUncheckedUpdateWithoutStandardInputObjectSchema)])
}).strict();
export const StandardMasteryUpdateWithWhereUniqueWithoutStandardInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpdateWithWhereUniqueWithoutStandardInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpdateWithWhereUniqueWithoutStandardInput>;
export const StandardMasteryUpdateWithWhereUniqueWithoutStandardInputObjectZodSchema = makeSchema();
