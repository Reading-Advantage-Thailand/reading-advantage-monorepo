import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateManyLessonInputObjectSchema as AssignmentCreateManyLessonInputObjectSchema } from './AssignmentCreateManyLessonInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => AssignmentCreateManyLessonInputObjectSchema), z.lazy(() => AssignmentCreateManyLessonInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const AssignmentCreateManyLessonInputEnvelopeObjectSchema: z.ZodType<Prisma.AssignmentCreateManyLessonInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateManyLessonInputEnvelope>;
export const AssignmentCreateManyLessonInputEnvelopeObjectZodSchema = makeSchema();
