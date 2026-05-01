import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateNestedOneWithoutAttemptsInputObjectSchema as userCreateNestedOneWithoutAttemptsInputObjectSchema } from './userCreateNestedOneWithoutAttemptsInput.schema';
import { LessonCreateNestedOneWithoutAttemptsInputObjectSchema as LessonCreateNestedOneWithoutAttemptsInputObjectSchema } from './LessonCreateNestedOneWithoutAttemptsInput.schema';
import { MasteryRunCreateNestedOneWithoutAttemptInputObjectSchema as MasteryRunCreateNestedOneWithoutAttemptInputObjectSchema } from './MasteryRunCreateNestedOneWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  score: z.number().optional(),
  maxScore: z.number(),
  attemptNumber: z.number().int(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  student: z.lazy(() => userCreateNestedOneWithoutAttemptsInputObjectSchema),
  lesson: z.lazy(() => LessonCreateNestedOneWithoutAttemptsInputObjectSchema),
  masteryRun: z.lazy(() => MasteryRunCreateNestedOneWithoutAttemptInputObjectSchema).optional()
}).strict();
export const AttemptCreateWithoutQuestionResponsesInputObjectSchema: z.ZodType<Prisma.AttemptCreateWithoutQuestionResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateWithoutQuestionResponsesInput>;
export const AttemptCreateWithoutQuestionResponsesInputObjectZodSchema = makeSchema();
