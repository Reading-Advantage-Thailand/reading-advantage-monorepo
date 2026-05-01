import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryCreateManyStandardInputObjectSchema as StandardMasteryCreateManyStandardInputObjectSchema } from './StandardMasteryCreateManyStandardInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => StandardMasteryCreateManyStandardInputObjectSchema), z.lazy(() => StandardMasteryCreateManyStandardInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const StandardMasteryCreateManyStandardInputEnvelopeObjectSchema: z.ZodType<Prisma.StandardMasteryCreateManyStandardInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateManyStandardInputEnvelope>;
export const StandardMasteryCreateManyStandardInputEnvelopeObjectZodSchema = makeSchema();
