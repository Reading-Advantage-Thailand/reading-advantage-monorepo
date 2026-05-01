import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryCreateManyStudentInputObjectSchema as StandardMasteryCreateManyStudentInputObjectSchema } from './StandardMasteryCreateManyStudentInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => StandardMasteryCreateManyStudentInputObjectSchema), z.lazy(() => StandardMasteryCreateManyStudentInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const StandardMasteryCreateManyStudentInputEnvelopeObjectSchema: z.ZodType<Prisma.StandardMasteryCreateManyStudentInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateManyStudentInputEnvelope>;
export const StandardMasteryCreateManyStudentInputEnvelopeObjectZodSchema = makeSchema();
