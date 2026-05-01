import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema';
import { StandardArgsObjectSchema as StandardArgsObjectSchema } from './StandardArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  studentId: z.boolean().optional(),
  standardId: z.boolean().optional(),
  masteryLevel: z.boolean().optional(),
  evidenceCount: z.boolean().optional(),
  lastAssessedAt: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  student: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  standard: z.union([z.boolean(), z.lazy(() => StandardArgsObjectSchema)]).optional()
}).strict();
export const StandardMasterySelectObjectSchema: z.ZodType<Prisma.StandardMasterySelect> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasterySelect>;
export const StandardMasterySelectObjectZodSchema = makeSchema();
