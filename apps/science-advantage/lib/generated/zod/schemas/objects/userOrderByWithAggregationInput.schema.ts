import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { userCountOrderByAggregateInputObjectSchema as userCountOrderByAggregateInputObjectSchema } from './userCountOrderByAggregateInput.schema';
import { userAvgOrderByAggregateInputObjectSchema as userAvgOrderByAggregateInputObjectSchema } from './userAvgOrderByAggregateInput.schema';
import { userMaxOrderByAggregateInputObjectSchema as userMaxOrderByAggregateInputObjectSchema } from './userMaxOrderByAggregateInput.schema';
import { userMinOrderByAggregateInputObjectSchema as userMinOrderByAggregateInputObjectSchema } from './userMinOrderByAggregateInput.schema';
import { userSumOrderByAggregateInputObjectSchema as userSumOrderByAggregateInputObjectSchema } from './userSumOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  name: SortOrderSchema.optional(),
  username: SortOrderSchema.optional(),
  displayUsername: SortOrderSchema.optional(),
  email: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  emailVerified: SortOrderSchema.optional(),
  image: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  role: SortOrderSchema.optional(),
  gradeLevel: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => userCountOrderByAggregateInputObjectSchema).optional(),
  _avg: z.lazy(() => userAvgOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => userMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => userMinOrderByAggregateInputObjectSchema).optional(),
  _sum: z.lazy(() => userSumOrderByAggregateInputObjectSchema).optional()
}).strict();
export const userOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.userOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.userOrderByWithAggregationInput>;
export const userOrderByWithAggregationInputObjectZodSchema = makeSchema();
