import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  gradeLevel: z.literal(true).optional(),
  order: z.literal(true).optional()
}).strict();
export const CurriculumUnitSumAggregateInputObjectSchema: z.ZodType<Prisma.CurriculumUnitSumAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitSumAggregateInputType>;
export const CurriculumUnitSumAggregateInputObjectZodSchema = makeSchema();
