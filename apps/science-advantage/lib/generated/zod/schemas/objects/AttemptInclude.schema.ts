import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema';
import { LessonArgsObjectSchema as LessonArgsObjectSchema } from './LessonArgs.schema';
import { QuestionResponseFindManySchema as QuestionResponseFindManySchema } from '../findManyQuestionResponse.schema';
import { MasteryRunArgsObjectSchema as MasteryRunArgsObjectSchema } from './MasteryRunArgs.schema';
import { AttemptCountOutputTypeArgsObjectSchema as AttemptCountOutputTypeArgsObjectSchema } from './AttemptCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  student: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  lesson: z.union([z.boolean(), z.lazy(() => LessonArgsObjectSchema)]).optional(),
  questionResponses: z.union([z.boolean(), z.lazy(() => QuestionResponseFindManySchema)]).optional(),
  masteryRun: z.union([z.boolean(), z.lazy(() => MasteryRunArgsObjectSchema)]).optional(),
  _count: z.union([z.boolean(), z.lazy(() => AttemptCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const AttemptIncludeObjectSchema: z.ZodType<Prisma.AttemptInclude> = makeSchema() as unknown as z.ZodType<Prisma.AttemptInclude>;
export const AttemptIncludeObjectZodSchema = makeSchema();
