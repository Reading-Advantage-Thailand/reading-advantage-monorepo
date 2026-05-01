import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionCreateManyLessonInputObjectSchema as LessonCompletionCreateManyLessonInputObjectSchema } from './LessonCompletionCreateManyLessonInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => LessonCompletionCreateManyLessonInputObjectSchema), z.lazy(() => LessonCompletionCreateManyLessonInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const LessonCompletionCreateManyLessonInputEnvelopeObjectSchema: z.ZodType<Prisma.LessonCompletionCreateManyLessonInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionCreateManyLessonInputEnvelope>;
export const LessonCompletionCreateManyLessonInputEnvelopeObjectZodSchema = makeSchema();
