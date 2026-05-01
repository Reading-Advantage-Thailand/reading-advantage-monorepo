import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseCreateManyQuestionInputObjectSchema as QuestionResponseCreateManyQuestionInputObjectSchema } from './QuestionResponseCreateManyQuestionInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => QuestionResponseCreateManyQuestionInputObjectSchema), z.lazy(() => QuestionResponseCreateManyQuestionInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const QuestionResponseCreateManyQuestionInputEnvelopeObjectSchema: z.ZodType<Prisma.QuestionResponseCreateManyQuestionInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseCreateManyQuestionInputEnvelope>;
export const QuestionResponseCreateManyQuestionInputEnvelopeObjectZodSchema = makeSchema();
