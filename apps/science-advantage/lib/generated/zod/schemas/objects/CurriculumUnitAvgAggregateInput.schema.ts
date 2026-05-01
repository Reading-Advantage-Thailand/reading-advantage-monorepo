import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  gradeLevel: z.literal(true).optional(),
  order: z.literal(true).optional()
}).strict();
export const CurriculumUnitAvgAggregateInputObjectSchema: z.ZodType<Prisma.CurriculumUnitAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitAvgAggregateInputType>;
export const CurriculumUnitAvgAggregateInputObjectZodSchema = makeSchema();
