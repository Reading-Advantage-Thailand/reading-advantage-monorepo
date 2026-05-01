import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema';
import { LessonArgsObjectSchema as LessonArgsObjectSchema } from './LessonArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  studentId: z.boolean().optional(),
  lessonId: z.boolean().optional(),
  status: z.boolean().optional(),
  completedAt: z.boolean().optional(),
  attemptsCount: z.boolean().optional(),
  bestScore: z.boolean().optional(),
  bestScorePercentage: z.boolean().optional(),
  mostRecentScore: z.boolean().optional(),
  mostRecentScorePercentage: z.boolean().optional(),
  totalTimeSpentSeconds: z.boolean().optional(),
  lastAttemptAt: z.boolean().optional(),
  student: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  lesson: z.union([z.boolean(), z.lazy(() => LessonArgsObjectSchema)]).optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional()
}).strict();
export const LessonCompletionSelectObjectSchema: z.ZodType<Prisma.LessonCompletionSelect> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionSelect>;
export const LessonCompletionSelectObjectZodSchema = makeSchema();
