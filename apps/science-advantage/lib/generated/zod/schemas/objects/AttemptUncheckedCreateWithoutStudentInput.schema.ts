import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema as QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedCreateNestedManyWithoutAttemptInput.schema';
import { MasteryRunUncheckedCreateNestedOneWithoutAttemptInputObjectSchema as MasteryRunUncheckedCreateNestedOneWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedCreateNestedOneWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  lessonId: z.string(),
  score: z.number().optional(),
  maxScore: z.number(),
  attemptNumber: z.number().int(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  questionResponses: z.lazy(() => QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema).optional(),
  masteryRun: z.lazy(() => MasteryRunUncheckedCreateNestedOneWithoutAttemptInputObjectSchema).optional()
}).strict();
export const AttemptUncheckedCreateWithoutStudentInputObjectSchema: z.ZodType<Prisma.AttemptUncheckedCreateWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUncheckedCreateWithoutStudentInput>;
export const AttemptUncheckedCreateWithoutStudentInputObjectZodSchema = makeSchema();
