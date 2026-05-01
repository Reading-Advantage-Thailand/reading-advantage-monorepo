import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryCreateWithoutStandardInputObjectSchema as StandardMasteryCreateWithoutStandardInputObjectSchema } from './StandardMasteryCreateWithoutStandardInput.schema';
import { StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema as StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedCreateWithoutStandardInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => StandardMasteryCreateWithoutStandardInputObjectSchema), z.lazy(() => StandardMasteryUncheckedCreateWithoutStandardInputObjectSchema)])
}).strict();
export const StandardMasteryCreateOrConnectWithoutStandardInputObjectSchema: z.ZodType<Prisma.StandardMasteryCreateOrConnectWithoutStandardInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateOrConnectWithoutStandardInput>;
export const StandardMasteryCreateOrConnectWithoutStandardInputObjectZodSchema = makeSchema();
