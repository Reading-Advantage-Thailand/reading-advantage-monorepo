import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema as QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedCreateNestedManyWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  studentId: z.string(),
  lessonId: z.string(),
  score: z.number().optional(),
  maxScore: z.number(),
  attemptNumber: z.number().int(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  questionResponses: z.lazy(() => QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema).optional()
}).strict();
export const AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema: z.ZodType<Prisma.AttemptUncheckedCreateWithoutMasteryRunInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUncheckedCreateWithoutMasteryRunInput>;
export const AttemptUncheckedCreateWithoutMasteryRunInputObjectZodSchema = makeSchema();
