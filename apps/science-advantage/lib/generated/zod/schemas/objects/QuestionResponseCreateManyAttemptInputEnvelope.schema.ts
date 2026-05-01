import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseCreateManyAttemptInputObjectSchema as QuestionResponseCreateManyAttemptInputObjectSchema } from './QuestionResponseCreateManyAttemptInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => QuestionResponseCreateManyAttemptInputObjectSchema), z.lazy(() => QuestionResponseCreateManyAttemptInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const QuestionResponseCreateManyAttemptInputEnvelopeObjectSchema: z.ZodType<Prisma.QuestionResponseCreateManyAttemptInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseCreateManyAttemptInputEnvelope>;
export const QuestionResponseCreateManyAttemptInputEnvelopeObjectZodSchema = makeSchema();
