import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunCreateManyStudentInputObjectSchema as MasteryRunCreateManyStudentInputObjectSchema } from './MasteryRunCreateManyStudentInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => MasteryRunCreateManyStudentInputObjectSchema), z.lazy(() => MasteryRunCreateManyStudentInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const MasteryRunCreateManyStudentInputEnvelopeObjectSchema: z.ZodType<Prisma.MasteryRunCreateManyStudentInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunCreateManyStudentInputEnvelope>;
export const MasteryRunCreateManyStudentInputEnvelopeObjectZodSchema = makeSchema();
