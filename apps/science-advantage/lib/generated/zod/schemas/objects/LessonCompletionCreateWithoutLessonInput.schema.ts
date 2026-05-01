import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema';
import { userCreateNestedOneWithoutLessonCompletionsInputObjectSchema as userCreateNestedOneWithoutLessonCompletionsInputObjectSchema } from './userCreateNestedOneWithoutLessonCompletionsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  status: LessonCompletionStatusSchema.optional(),
  completedAt: z.coerce.date().optional().nullable(),
  attemptsCount: z.number().int().optional(),
  bestScore: z.number().optional().nullable(),
  bestScorePercentage: z.number().optional().nullable(),
  mostRecentScore: z.number().optional().nullable(),
  mostRecentScorePercentage: z.number().optional().nullable(),
  totalTimeSpentSeconds: z.number().int().optional(),
  lastAttemptAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  student: z.lazy(() => userCreateNestedOneWithoutLessonCompletionsInputObjectSchema)
}).strict();
export const LessonCompletionCreateWithoutLessonInputObjectSchema: z.ZodType<Prisma.LessonCompletionCreateWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionCreateWithoutLessonInput>;
export const LessonCompletionCreateWithoutLessonInputObjectZodSchema = makeSchema();
