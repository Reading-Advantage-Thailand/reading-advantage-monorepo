import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionCreateManyStudentInputObjectSchema as LessonCompletionCreateManyStudentInputObjectSchema } from './LessonCompletionCreateManyStudentInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => LessonCompletionCreateManyStudentInputObjectSchema), z.lazy(() => LessonCompletionCreateManyStudentInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const LessonCompletionCreateManyStudentInputEnvelopeObjectSchema: z.ZodType<Prisma.LessonCompletionCreateManyStudentInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionCreateManyStudentInputEnvelope>;
export const LessonCompletionCreateManyStudentInputEnvelopeObjectZodSchema = makeSchema();
