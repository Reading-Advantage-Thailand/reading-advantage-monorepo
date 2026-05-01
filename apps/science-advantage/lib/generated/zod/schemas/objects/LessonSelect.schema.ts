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
  id: z.boolean().optional(),
  slug: z.boolean().optional(),
  title: z.boolean().optional(),
  titleThai: z.boolean().optional(),
  description: z.boolean().optional(),
  descriptionThai: z.boolean().optional(),
  content: z.boolean().optional(),
  structuredContent: z.boolean().optional(),
  lessonType: z.boolean().optional(),
  gradeLevel: z.boolean().optional(),
  order: z.boolean().optional(),
  standards: z.union([z.boolean(), z.lazy(() => StandardFindManySchema)]).optional(),
  curriculumUnits: z.union([z.boolean(), z.lazy(() => CurriculumUnitFindManySchema)]).optional(),
  quizQuestions: z.union([z.boolean(), z.lazy(() => QuizQuestionFindManySchema)]).optional(),
  attempts: z.union([z.boolean(), z.lazy(() => AttemptFindManySchema)]).optional(),
  lessonCompletions: z.union([z.boolean(), z.lazy(() => LessonCompletionFindManySchema)]).optional(),
  assignments: z.union([z.boolean(), z.lazy(() => AssignmentFindManySchema)]).optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  _count: z.union([z.boolean(), z.lazy(() => LessonCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const LessonSelectObjectSchema: z.ZodType<Prisma.LessonSelect> = makeSchema() as unknown as z.ZodType<Prisma.LessonSelect>;
export const LessonSelectObjectZodSchema = makeSchema();
