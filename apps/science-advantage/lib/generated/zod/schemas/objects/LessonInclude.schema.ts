import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardFindManySchema as StandardFindManySchema } from '../findManyStandard.schema';
import { CurriculumUnitFindManySchema as CurriculumUnitFindManySchema } from '../findManyCurriculumUnit.schema';
import { QuizQuestionFindManySchema as QuizQuestionFindManySchema } from '../findManyQuizQuestion.schema';
import { AttemptFindManySchema as AttemptFindManySchema } from '../findManyAttempt.schema';
import { LessonCompletionFindManySchema as LessonCompletionFindManySchema } from '../findManyLessonCompletion.schema';
import { AssignmentFindManySchema as AssignmentFindManySchema } from '../findManyAssignment.schema';
import { LessonCountOutputTypeArgsObjectSchema as LessonCountOutputTypeArgsObjectSchema } from './LessonCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  standards: z.union([z.boolean(), z.lazy(() => StandardFindManySchema)]).optional(),
  curriculumUnits: z.union([z.boolean(), z.lazy(() => CurriculumUnitFindManySchema)]).optional(),
  quizQuestions: z.union([z.boolean(), z.lazy(() => QuizQuestionFindManySchema)]).optional(),
  attempts: z.union([z.boolean(), z.lazy(() => AttemptFindManySchema)]).optional(),
  lessonCompletions: z.union([z.boolean(), z.lazy(() => LessonCompletionFindManySchema)]).optional(),
  assignments: z.union([z.boolean(), z.lazy(() => AssignmentFindManySchema)]).optional(),
  _count: z.union([z.boolean(), z.lazy(() => LessonCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const LessonIncludeObjectSchema: z.ZodType<Prisma.LessonInclude> = makeSchema() as unknown as z.ZodType<Prisma.LessonInclude>;
export const LessonIncludeObjectZodSchema = makeSchema();
