import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonArgsObjectSchema as LessonArgsObjectSchema } from './LessonArgs.schema';
import { StandardFindManySchema as StandardFindManySchema } from '../findManyStandard.schema';
import { QuestionResponseFindManySchema as QuestionResponseFindManySchema } from '../findManyQuestionResponse.schema';
import { QuizQuestionCountOutputTypeArgsObjectSchema as QuizQuestionCountOutputTypeArgsObjectSchema } from './QuizQuestionCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  slug: z.boolean().optional(),
  lessonId: z.boolean().optional(),
  type: z.boolean().optional(),
  text: z.boolean().optional(),
  options: z.boolean().optional(),
  correctAnswer: z.boolean().optional(),
  points: z.boolean().optional(),
  order: z.boolean().optional(),
  version: z.boolean().optional(),
  lesson: z.union([z.boolean(), z.lazy(() => LessonArgsObjectSchema)]).optional(),
  standards: z.union([z.boolean(), z.lazy(() => StandardFindManySchema)]).optional(),
  responses: z.union([z.boolean(), z.lazy(() => QuestionResponseFindManySchema)]).optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  _count: z.union([z.boolean(), z.lazy(() => QuizQuestionCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const QuizQuestionSelectObjectSchema: z.ZodType<Prisma.QuizQuestionSelect> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionSelect>;
export const QuizQuestionSelectObjectZodSchema = makeSchema();
