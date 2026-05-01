import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonFindManySchema as LessonFindManySchema } from '../findManyLesson.schema';
import { QuizQuestionFindManySchema as QuizQuestionFindManySchema } from '../findManyQuizQuestion.schema';
import { StandardMasteryFindManySchema as StandardMasteryFindManySchema } from '../findManyStandardMastery.schema';
import { StandardCountOutputTypeArgsObjectSchema as StandardCountOutputTypeArgsObjectSchema } from './StandardCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  lessons: z.union([z.boolean(), z.lazy(() => LessonFindManySchema)]).optional(),
  quizQuestions: z.union([z.boolean(), z.lazy(() => QuizQuestionFindManySchema)]).optional(),
  masteryRecords: z.union([z.boolean(), z.lazy(() => StandardMasteryFindManySchema)]).optional(),
  _count: z.union([z.boolean(), z.lazy(() => StandardCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const StandardIncludeObjectSchema: z.ZodType<Prisma.StandardInclude> = makeSchema() as unknown as z.ZodType<Prisma.StandardInclude>;
export const StandardIncludeObjectZodSchema = makeSchema();
