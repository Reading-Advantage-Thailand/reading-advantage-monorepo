import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { ClassOrderByWithRelationInputObjectSchema as ClassOrderByWithRelationInputObjectSchema } from './ClassOrderByWithRelationInput.schema';
import { LessonOrderByWithRelationInputObjectSchema as LessonOrderByWithRelationInputObjectSchema } from './LessonOrderByWithRelationInput.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './userOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  classId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  assignedAt: SortOrderSchema.optional(),
  dueAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  assignedBy: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  class: z.lazy(() => ClassOrderByWithRelationInputObjectSchema).optional(),
  lesson: z.lazy(() => LessonOrderByWithRelationInputObjectSchema).optional(),
  teacher: z.lazy(() => userOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const AssignmentOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.AssignmentOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentOrderByWithRelationInput>;
export const AssignmentOrderByWithRelationInputObjectZodSchema = makeSchema();
