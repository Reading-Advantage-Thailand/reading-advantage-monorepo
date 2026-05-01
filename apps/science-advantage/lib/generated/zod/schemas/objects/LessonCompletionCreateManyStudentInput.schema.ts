import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  lessonId: z.string(),
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
  updatedAt: z.coerce.date().optional()
}).strict();
export const LessonCompletionCreateManyStudentInputObjectSchema: z.ZodType<Prisma.LessonCompletionCreateManyStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionCreateManyStudentInput>;
export const LessonCompletionCreateManyStudentInputObjectZodSchema = makeSchema();
