import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  framework: StandardsAlignmentSchema,
  gradeLevel: z.number().int(),
  order: z.number().int(),
  classId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const CurriculumUnitCreateManyInputObjectSchema: z.ZodType<Prisma.CurriculumUnitCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitCreateManyInput>;
export const CurriculumUnitCreateManyInputObjectZodSchema = makeSchema();
