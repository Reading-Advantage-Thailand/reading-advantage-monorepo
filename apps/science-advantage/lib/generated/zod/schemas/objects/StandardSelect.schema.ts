import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonFindManySchema as LessonFindManySchema } from '../findManyLesson.schema';
import { QuizQuestionFindManySchema as QuizQuestionFindManySchema } from '../findManyQuizQuestion.schema';
import { StandardMasteryFindManySchema as StandardMasteryFindManySchema } from '../findManyStandardMastery.schema';
import { StandardCountOutputTypeArgsObjectSchema as StandardCountOutputTypeArgsObjectSchema } from './StandardCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  framework: z.boolean().optional(),
  code: z.boolean().optional(),
  description: z.boolean().optional(),
  gradeLevel: z.boolean().optional(),
  lessons: z.union([z.boolean(), z.lazy(() => LessonFindManySchema)]).optional(),
  quizQuestions: z.union([z.boolean(), z.lazy(() => QuizQuestionFindManySchema)]).optional(),
  masteryRecords: z.union([z.boolean(), z.lazy(() => StandardMasteryFindManySchema)]).optional(),
  _count: z.union([z.boolean(), z.lazy(() => StandardCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const StandardSelectObjectSchema: z.ZodType<Prisma.StandardSelect> = makeSchema() as unknown as z.ZodType<Prisma.StandardSelect>;
export const StandardSelectObjectZodSchema = makeSchema();
