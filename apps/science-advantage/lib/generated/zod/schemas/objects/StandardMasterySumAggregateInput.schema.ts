import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  masteryLevel: z.literal(true).optional(),
  evidenceCount: z.literal(true).optional()
}).strict();
export const StandardMasterySumAggregateInputObjectSchema: z.ZodType<Prisma.StandardMasterySumAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasterySumAggregateInputType>;
export const StandardMasterySumAggregateInputObjectZodSchema = makeSchema();
