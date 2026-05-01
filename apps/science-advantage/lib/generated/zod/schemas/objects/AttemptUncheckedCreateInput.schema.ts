import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema as QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedCreateNestedManyWithoutAttemptInput.schema';
import { MasteryRunUncheckedCreateNestedOneWithoutAttemptInputObjectSchema as MasteryRunUncheckedCreateNestedOneWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedCreateNestedOneWithoutAttemptInput.schema'

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
  questionResponses: z.lazy(() => QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema),
  masteryRun: z.lazy(() => MasteryRunUncheckedCreateNestedOneWithoutAttemptInputObjectSchema).optional()
}).strict();
export const AttemptUncheckedCreateInputObjectSchema: z.ZodType<Prisma.AttemptUncheckedCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUncheckedCreateInput>;
export const AttemptUncheckedCreateInputObjectZodSchema = makeSchema();
