import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  slug: z.literal(true).optional(),
  title: z.literal(true).optional(),
  description: z.literal(true).optional(),
  framework: z.literal(true).optional(),
  gradeLevel: z.literal(true).optional(),
  order: z.literal(true).optional(),
  classId: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional()
}).strict();
export const CurriculumUnitMaxAggregateInputObjectSchema: z.ZodType<Prisma.CurriculumUnitMaxAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitMaxAggregateInputType>;
export const CurriculumUnitMaxAggregateInputObjectZodSchema = makeSchema();
