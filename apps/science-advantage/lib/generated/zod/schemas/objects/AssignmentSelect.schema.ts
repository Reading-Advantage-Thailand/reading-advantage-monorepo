import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassArgsObjectSchema as ClassArgsObjectSchema } from './ClassArgs.schema';
import { LessonArgsObjectSchema as LessonArgsObjectSchema } from './LessonArgs.schema';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  classId: z.boolean().optional(),
  lessonId: z.boolean().optional(),
  assignedAt: z.boolean().optional(),
  dueAt: z.boolean().optional(),
  assignedBy: z.boolean().optional(),
  class: z.union([z.boolean(), z.lazy(() => ClassArgsObjectSchema)]).optional(),
  lesson: z.union([z.boolean(), z.lazy(() => LessonArgsObjectSchema)]).optional(),
  teacher: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  createdAt: z.boolean().optional()
}).strict();
export const AssignmentSelectObjectSchema: z.ZodType<Prisma.AssignmentSelect> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentSelect>;
export const AssignmentSelectObjectZodSchema = makeSchema();
