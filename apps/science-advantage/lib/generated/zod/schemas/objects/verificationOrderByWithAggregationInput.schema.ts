import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { verificationCountOrderByAggregateInputObjectSchema as verificationCountOrderByAggregateInputObjectSchema } from './verificationCountOrderByAggregateInput.schema';
import { verificationMaxOrderByAggregateInputObjectSchema as verificationMaxOrderByAggregateInputObjectSchema } from './verificationMaxOrderByAggregateInput.schema';
import { verificationMinOrderByAggregateInputObjectSchema as verificationMinOrderByAggregateInputObjectSchema } from './verificationMinOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  identifier: SortOrderSchema.optional(),
  value: SortOrderSchema.optional(),
  expiresAt: SortOrderSchema.optional(),
  createdAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  updatedAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  _count: z.lazy(() => verificationCountOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => verificationMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => verificationMinOrderByAggregateInputObjectSchema).optional()
}).strict();
export const verificationOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.verificationOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.verificationOrderByWithAggregationInput>;
export const verificationOrderByWithAggregationInputObjectZodSchema = makeSchema();
