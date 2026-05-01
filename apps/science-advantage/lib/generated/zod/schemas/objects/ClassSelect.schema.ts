import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema';
import { userFindManySchema as userFindManySchema } from '../findManyuser.schema';
import { CurriculumUnitFindManySchema as CurriculumUnitFindManySchema } from '../findManyCurriculumUnit.schema';
import { AssignmentFindManySchema as AssignmentFindManySchema } from '../findManyAssignment.schema';
import { ClassCountOutputTypeArgsObjectSchema as ClassCountOutputTypeArgsObjectSchema } from './ClassCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  gradeLevel: z.boolean().optional(),
  standardsAlignment: z.boolean().optional(),
  joinCode: z.boolean().optional(),
  teacherId: z.boolean().optional(),
  teacher: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  students: z.union([z.boolean(), z.lazy(() => userFindManySchema)]).optional(),
  curriculumUnits: z.union([z.boolean(), z.lazy(() => CurriculumUnitFindManySchema)]).optional(),
  assignments: z.union([z.boolean(), z.lazy(() => AssignmentFindManySchema)]).optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  _count: z.union([z.boolean(), z.lazy(() => ClassCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const ClassSelectObjectSchema: z.ZodType<Prisma.ClassSelect> = makeSchema() as unknown as z.ZodType<Prisma.ClassSelect>;
export const ClassSelectObjectZodSchema = makeSchema();
