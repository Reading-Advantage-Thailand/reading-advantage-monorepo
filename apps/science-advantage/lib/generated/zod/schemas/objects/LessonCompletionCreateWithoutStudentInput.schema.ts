import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema';
import { LessonCreateNestedOneWithoutLessonCompletionsInputObjectSchema as LessonCreateNestedOneWithoutLessonCompletionsInputObjectSchema } from './LessonCreateNestedOneWithoutLessonCompletionsInput.schema'

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
  lesson: z.lazy(() => LessonCreateNestedOneWithoutLessonCompletionsInputObjectSchema)
}).strict();
export const LessonCompletionCreateWithoutStudentInputObjectSchema: z.ZodType<Prisma.LessonCompletionCreateWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionCreateWithoutStudentInput>;
export const LessonCompletionCreateWithoutStudentInputObjectZodSchema = makeSchema();
