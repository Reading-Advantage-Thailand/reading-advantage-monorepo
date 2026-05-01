import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  updatedCount: z.literal(true).optional()
}).strict();
export const MasteryRunAvgAggregateInputObjectSchema: z.ZodType<Prisma.MasteryRunAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunAvgAggregateInputType>;
export const MasteryRunAvgAggregateInputObjectZodSchema = makeSchema();
