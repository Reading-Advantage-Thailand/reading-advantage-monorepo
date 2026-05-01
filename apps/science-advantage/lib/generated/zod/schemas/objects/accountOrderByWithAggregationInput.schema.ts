import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { accountCountOrderByAggregateInputObjectSchema as accountCountOrderByAggregateInputObjectSchema } from './accountCountOrderByAggregateInput.schema';
import { accountMaxOrderByAggregateInputObjectSchema as accountMaxOrderByAggregateInputObjectSchema } from './accountMaxOrderByAggregateInput.schema';
import { accountMinOrderByAggregateInputObjectSchema as accountMinOrderByAggregateInputObjectSchema } from './accountMinOrderByAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  accountId: SortOrderSchema.optional(),
  providerId: SortOrderSchema.optional(),
  userId: SortOrderSchema.optional(),
  accessToken: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  refreshToken: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  idToken: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  accessTokenExpiresAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  refreshTokenExpiresAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  scope: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  password: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  _count: z.lazy(() => accountCountOrderByAggregateInputObjectSchema).optional(),
  _max: z.lazy(() => accountMaxOrderByAggregateInputObjectSchema).optional(),
  _min: z.lazy(() => accountMinOrderByAggregateInputObjectSchema).optional()
}).strict();
export const accountOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.accountOrderByWithAggregationInput> = makeSchema() as unknown as z.ZodType<Prisma.accountOrderByWithAggregationInput>;
export const accountOrderByWithAggregationInputObjectZodSchema = makeSchema();
