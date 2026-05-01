import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassArgsObjectSchema as ClassArgsObjectSchema } from './ClassArgs.schema';
import { LessonArgsObjectSchema as LessonArgsObjectSchema } from './LessonArgs.schema';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema'

const makeSchema = () => z.object({
  class: z.union([z.boolean(), z.lazy(() => ClassArgsObjectSchema)]).optional(),
  lesson: z.union([z.boolean(), z.lazy(() => LessonArgsObjectSchema)]).optional(),
  teacher: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional()
}).strict();
export const AssignmentIncludeObjectSchema: z.ZodType<Prisma.AssignmentInclude> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentInclude>;
export const AssignmentIncludeObjectZodSchema = makeSchema();
