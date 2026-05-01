import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  attemptId: z.literal(true).optional(),
  studentId: z.literal(true).optional(),
  status: z.literal(true).optional(),
  updatedCount: z.literal(true).optional(),
  lastError: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional()
}).strict();
export const MasteryRunMinAggregateInputObjectSchema: z.ZodType<Prisma.MasteryRunMinAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunMinAggregateInputType>;
export const MasteryRunMinAggregateInputObjectZodSchema = makeSchema();
