import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema';
import { userFindManySchema as userFindManySchema } from '../findManyuser.schema';
import { CurriculumUnitFindManySchema as CurriculumUnitFindManySchema } from '../findManyCurriculumUnit.schema';
import { AssignmentFindManySchema as AssignmentFindManySchema } from '../findManyAssignment.schema';
import { ClassCountOutputTypeArgsObjectSchema as ClassCountOutputTypeArgsObjectSchema } from './ClassCountOutputTypeArgs.schema'

const makeSchema = () => z.object({
  teacher: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  students: z.union([z.boolean(), z.lazy(() => userFindManySchema)]).optional(),
  curriculumUnits: z.union([z.boolean(), z.lazy(() => CurriculumUnitFindManySchema)]).optional(),
  assignments: z.union([z.boolean(), z.lazy(() => AssignmentFindManySchema)]).optional(),
  _count: z.union([z.boolean(), z.lazy(() => ClassCountOutputTypeArgsObjectSchema)]).optional()
}).strict();
export const ClassIncludeObjectSchema: z.ZodType<Prisma.ClassInclude> = makeSchema() as unknown as z.ZodType<Prisma.ClassInclude>;
export const ClassIncludeObjectZodSchema = makeSchema();
