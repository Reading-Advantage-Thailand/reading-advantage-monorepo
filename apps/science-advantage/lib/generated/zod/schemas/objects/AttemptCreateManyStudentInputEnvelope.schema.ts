import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateManyStudentInputObjectSchema as AttemptCreateManyStudentInputObjectSchema } from './AttemptCreateManyStudentInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => AttemptCreateManyStudentInputObjectSchema), z.lazy(() => AttemptCreateManyStudentInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const AttemptCreateManyStudentInputEnvelopeObjectSchema: z.ZodType<Prisma.AttemptCreateManyStudentInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateManyStudentInputEnvelope>;
export const AttemptCreateManyStudentInputEnvelopeObjectZodSchema = makeSchema();
