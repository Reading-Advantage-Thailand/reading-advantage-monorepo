import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { AssignmentCountOrderByAggregateInputObjectSchema as AssignmentCountOrderByAggregateInputObjectSchema } from './AssignmentCountOrderByAggregateInput.schema';
import { AssignmentMaxOrderByAggregateInputObjectSchema as AssignmentMaxOrderByAggregateInputObjectSchema } from './AssignmentMaxOrderByAggregateInput.schema';
import { AssignmentMinOrderByAggregateInputObjectSchema as AssignmentMinOrderByAggregateInputObjectSchema } from './AssignmentMinOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  classId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  assignedAt: SortOrderSchema.optional(),
  dueAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  assignedBy: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  _count: z.lazy(() => AssignmentCountOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => AssignmentMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => AssignmentMinOrderByAggregateInputObjectSchema).optional()
}).strict();
export const AssignmentOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.AssignmentOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentOrderByWithAggregationInput>;
export const AssignmentOrderByWithAggregationInputObjectZodSchema = makeSchema();
