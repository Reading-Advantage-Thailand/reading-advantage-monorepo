import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  updatedCount: z.literal(true).optional()
}).strict();
export const MasteryRunSumAggregateInputObjectSchema: z.ZodType<Prisma.MasteryRunSumAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunSumAggregateInputType>;
export const MasteryRunSumAggregateInputObjectZodSchema = makeSchema();
