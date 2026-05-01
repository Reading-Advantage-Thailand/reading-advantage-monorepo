import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionCreateManyLessonInputObjectSchema as QuizQuestionCreateManyLessonInputObjectSchema } from './QuizQuestionCreateManyLessonInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => QuizQuestionCreateManyLessonInputObjectSchema), z.lazy(() => QuizQuestionCreateManyLessonInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const QuizQuestionCreateManyLessonInputEnvelopeObjectSchema: z.ZodType<Prisma.QuizQuestionCreateManyLessonInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCreateManyLessonInputEnvelope>;
export const QuizQuestionCreateManyLessonInputEnvelopeObjectZodSchema = makeSchema();
