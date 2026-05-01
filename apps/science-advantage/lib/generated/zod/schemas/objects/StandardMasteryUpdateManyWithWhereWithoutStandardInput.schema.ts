import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryScalarWhereInputObjectSchema as StandardMasteryScalarWhereInputObjectSchema } from './StandardMasteryScalarWhereInput.schema';
import { StandardMasteryUpdateManyMutationInputObjectSchema as StandardMasteryUpdateManyMutationInputObjectSchema } from './StandardMasteryUpdateManyMutationInput.schema';
import { StandardMasteryUncheckedUpdateManyWithoutStandardInputObjectSchema as StandardMasteryUncheckedUpdateManyWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedUpdateManyWithoutStandardInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardMasteryScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => StandardMasteryUpdateManyMutationInputObjectSchema), z.lazy(() => StandardMasteryUncheckedUpdateManyWithoutStandardInputObjectSchema)])
}).strict();
export const StandardMasteryUpdateManyWithWhereWithoutStandardInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpdateManyWithWhereWithoutStandardInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpdateManyWithWhereWithoutStandardInput>;
export const StandardMasteryUpdateManyWithWhereWithoutStandardInputObjectZodSchema = makeSchema();
