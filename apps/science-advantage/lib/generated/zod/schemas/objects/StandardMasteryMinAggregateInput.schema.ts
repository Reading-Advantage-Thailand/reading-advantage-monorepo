import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  studentId: z.literal(true).optional(),
  standardId: z.literal(true).optional(),
  masteryLevel: z.literal(true).optional(),
  evidenceCount: z.literal(true).optional(),
  lastAssessedAt: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional()
}).strict();
export const StandardMasteryMinAggregateInputObjectSchema: z.ZodType<Prisma.StandardMasteryMinAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryMinAggregateInputType>;
export const StandardMasteryMinAggregateInputObjectZodSchema = makeSchema();
