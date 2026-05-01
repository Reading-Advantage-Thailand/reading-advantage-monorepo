import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateManyTeacherInputObjectSchema as AssignmentCreateManyTeacherInputObjectSchema } from './AssignmentCreateManyTeacherInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => AssignmentCreateManyTeacherInputObjectSchema), z.lazy(() => AssignmentCreateManyTeacherInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const AssignmentCreateManyTeacherInputEnvelopeObjectSchema: z.ZodType<Prisma.AssignmentCreateManyTeacherInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateManyTeacherInputEnvelope>;
export const AssignmentCreateManyTeacherInputEnvelopeObjectZodSchema = makeSchema();
