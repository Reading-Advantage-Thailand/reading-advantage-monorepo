import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './userOrderByWithRelationInput.schema';
import { userOrderByRelationAggregateInputObjectSchema as userOrderByRelationAggregateInputObjectSchema } from './userOrderByRelationAggregateInput.schema';
import { CurriculumUnitOrderByRelationAggregateInputObjectSchema as CurriculumUnitOrderByRelationAggregateInputObjectSchema } from './CurriculumUnitOrderByRelationAggregateInput.schema';
import { AssignmentOrderByRelationAggregateInputObjectSchema as AssignmentOrderByRelationAggregateInputObjectSchema } from './AssignmentOrderByRelationAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  name: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  standardsAlignment: SortOrderSchema.optional(),
  joinCode: SortOrderSchema.optional(),
  teacherId: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  teacher: z.lazy(() => userOrderByWithRelationInputObjectSchema).optional(),
  students: z.lazy(() => userOrderByRelationAggregateInputObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitOrderByRelationAggregateInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentOrderByRelationAggregateInputObjectSchema).optional()
}).strict();
export const ClassOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.ClassOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassOrderByWithRelationInput>;
export const ClassOrderByWithRelationInputObjectZodSchema = makeSchema();
