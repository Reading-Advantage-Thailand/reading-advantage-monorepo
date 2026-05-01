import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema';
import { LessonArgsObjectSchema as LessonArgsObjectSchema } from './LessonArgs.schema';
import { QuestionResponseFindManySchema as QuestionResponseFindManySchema } from '../findManyQuestionResponse.schema';
import { MasteryRunArgsObjectSchema as MasteryRunArgsObjectSchema } from './MasteryRunArgs.schema';
import { AttemptCountOutputTypeArgsObjectSchema as AttemptCountOutputTypeArgsObjectSchema } from './AttemptCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  studentId: z.boolean().optional(),
  lessonId: z.boolean().optional(),
  score: z.boolean().optional(),
  maxScore: z.boolean().optional(),
  attemptNumber: z.boolean().optional(),
  startedAt: z.boolean().optional(),
  completedAt: z.boolean().optional(),
  student: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  lesson: z.union([z.boolean(), z.lazy(() => LessonArgsObjectSchema)]).optional(),
  questionResponses: z.union([z.boolean(), z.lazy(() => QuestionResponseFindManySchema)]).optional(),
  masteryRun: z.union([z.boolean(), z.lazy(() => MasteryRunArgsObjectSchema)]).optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  _count: z.union([z.boolean(), z.lazy(() => AttemptCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const AttemptSelectObjectSchema: z.ZodType<Prisma.AttemptSelect> = makeSchema() as unknown as z.ZodType<Prisma.AttemptSelect>;
export const AttemptSelectObjectZodSchema = makeSchema();
