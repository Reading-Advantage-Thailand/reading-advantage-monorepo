import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  identifier: SortOrderSchema.optional(),
  value: SortOrderSchema.optional(),
  expiresAt: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const verificationMinOrderByAggregateInputObjectSchema: z.ZodType<Prisma.verificationMinOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.verificationMinOrderByAggregateInput>;
export const verificationMinOrderByAggregateInputObjectZodSchema = makeSchema();
