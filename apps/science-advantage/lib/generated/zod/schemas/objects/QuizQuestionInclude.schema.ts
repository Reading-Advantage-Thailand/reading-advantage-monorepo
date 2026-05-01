import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonArgsObjectSchema as LessonArgsObjectSchema } from './LessonArgs.schema';
import { StandardFindManySchema as StandardFindManySchema } from '../findManyStandard.schema';
import { QuestionResponseFindManySchema as QuestionResponseFindManySchema } from '../findManyQuestionResponse.schema';
import { QuizQuestionCountOutputTypeArgsObjectSchema as QuizQuestionCountOutputTypeArgsObjectSchema } from './QuizQuestionCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  lesson: z.union([z.boolean(), z.lazy(() => LessonArgsObjectSchema)]).optional(),
  standards: z.union([z.boolean(), z.lazy(() => StandardFindManySchema)]).optional(),
  responses: z.union([z.boolean(), z.lazy(() => QuestionResponseFindManySchema)]).optional(),
  _count: z.union([z.boolean(), z.lazy(() => QuizQuestionCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const QuizQuestionIncludeObjectSchema: z.ZodType<Prisma.QuizQuestionInclude> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionInclude>;
export const QuizQuestionIncludeObjectZodSchema = makeSchema();
