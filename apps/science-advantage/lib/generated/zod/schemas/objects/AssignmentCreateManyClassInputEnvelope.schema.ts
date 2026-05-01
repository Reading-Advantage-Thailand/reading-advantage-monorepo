import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateManyClassInputObjectSchema as AssignmentCreateManyClassInputObjectSchema } from './AssignmentCreateManyClassInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => AssignmentCreateManyClassInputObjectSchema), z.lazy(() => AssignmentCreateManyClassInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const AssignmentCreateManyClassInputEnvelopeObjectSchema: z.ZodType<Prisma.AssignmentCreateManyClassInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateManyClassInputEnvelope>;
export const AssignmentCreateManyClassInputEnvelopeObjectZodSchema = makeSchema();
