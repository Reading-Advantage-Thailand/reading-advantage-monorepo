import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './userOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  expiresAt: SortOrderSchema.optional(),
  token: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  ipAddress: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  userAgent: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  userId: SortOrderSchema.optional(),
  user: z.lazy(() => userOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const sessionOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.sessionOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionOrderByWithRelationInput>;
export const sessionOrderByWithRelationInputObjectZodSchema = makeSchema();
