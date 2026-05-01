import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonFindManySchema as LessonFindManySchema } from '../findManyLesson.schema';
import { ClassArgsObjectSchema as ClassArgsObjectSchema } from './ClassArgs.schema';
import { CurriculumUnitCountOutputTypeArgsObjectSchema as CurriculumUnitCountOutputTypeArgsObjectSchema } from './CurriculumUnitCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  lessons: z.union([z.boolean(), z.lazy(() => LessonFindManySchema)]).optional(),
  class: z.union([z.boolean(), z.lazy(() => ClassArgsObjectSchema)]).optional(),
  _count: z.union([z.boolean(), z.lazy(() => CurriculumUnitCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const CurriculumUnitIncludeObjectSchema: z.ZodType<Prisma.CurriculumUnitInclude> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitInclude>;
export const CurriculumUnitIncludeObjectZodSchema = makeSchema();
