import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { sessionCountOrderByAggregateInputObjectSchema as sessionCountOrderByAggregateInputObjectSchema } from './sessionCountOrderByAggregateInput.schema';
import { sessionMaxOrderByAggregateInputObjectSchema as sessionMaxOrderByAggregateInputObjectSchema } from './sessionMaxOrderByAggregateInput.schema';
import { sessionMinOrderByAggregateInputObjectSchema as sessionMinOrderByAggregateInputObjectSchema } from './sessionMinOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  expiresAt: SortOrderSchema.optional(),
  token: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  ipAddress: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  userAgent: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  userId: SortOrderSchema.optional(),
  _count: z.lazy(() => sessionCountOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => sessionMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => sessionMinOrderByAggregateInputObjectSchema).optional()
}).strict();
export const sessionOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.sessionOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionOrderByWithAggregationInput>;
export const sessionOrderByWithAggregationInputObjectZodSchema = makeSchema();
