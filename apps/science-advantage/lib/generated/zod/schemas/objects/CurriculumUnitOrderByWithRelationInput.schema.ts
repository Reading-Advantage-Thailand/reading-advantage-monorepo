import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { LessonOrderByRelationAggregateInputObjectSchema as LessonOrderByRelationAggregateInputObjectSchema } from './LessonOrderByRelationAggregateInput.schema';
import { ClassOrderByWithRelationInputObjectSchema as ClassOrderByWithRelationInputObjectSchema } from './ClassOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  title: SortOrderSchema.optional(),
  description: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  framework: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  classId: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  lessons: z.lazy(() => LessonOrderByRelationAggregateInputObjectSchema).optional(),
  class: z.lazy(() => ClassOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const CurriculumUnitOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.CurriculumUnitOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitOrderByWithRelationInput>;
export const CurriculumUnitOrderByWithRelationInputObjectZodSchema = makeSchema();
