import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonFindManySchema as LessonFindManySchema } from '../findManyLesson.schema';
import { ClassArgsObjectSchema as ClassArgsObjectSchema } from './ClassArgs.schema';
import { CurriculumUnitCountOutputTypeArgsObjectSchema as CurriculumUnitCountOutputTypeArgsObjectSchema } from './CurriculumUnitCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  slug: z.boolean().optional(),
  title: z.boolean().optional(),
  description: z.boolean().optional(),
  framework: z.boolean().optional(),
  gradeLevel: z.boolean().optional(),
  order: z.boolean().optional(),
  lessons: z.union([z.boolean(), z.lazy(() => LessonFindManySchema)]).optional(),
  classId: z.boolean().optional(),
  class: z.union([z.boolean(), z.lazy(() => ClassArgsObjectSchema)]).optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  _count: z.union([z.boolean(), z.lazy(() => CurriculumUnitCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const CurriculumUnitSelectObjectSchema: z.ZodType<Prisma.CurriculumUnitSelect> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitSelect>;
export const CurriculumUnitSelectObjectZodSchema = makeSchema();
