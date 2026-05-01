import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentSelectObjectSchema as AssignmentSelectObjectSchema } from './AssignmentSelect.schema';
import { AssignmentIncludeObjectSchema as AssignmentIncludeObjectSchema } from './AssignmentInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => AssignmentSelectObjectSchema).optional(),
  include: z.lazy(() => AssignmentIncludeObjectSchema).optional()
}).strict();
export const AssignmentArgsObjectSchema = makeSchema();
export const AssignmentArgsObjectZodSchema = makeSchema();
