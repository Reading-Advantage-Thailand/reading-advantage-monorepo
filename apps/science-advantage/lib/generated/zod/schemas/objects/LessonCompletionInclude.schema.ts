import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema';
import { LessonArgsObjectSchema as LessonArgsObjectSchema } from './LessonArgs.schema'

const makeSchema = () => z.object({
  student: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  lesson: z.union([z.boolean(), z.lazy(() => LessonArgsObjectSchema)]).optional()
}).strict();
export const LessonCompletionIncludeObjectSchema: z.ZodType<Prisma.LessonCompletionInclude> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionInclude>;
export const LessonCompletionIncludeObjectZodSchema = makeSchema();
