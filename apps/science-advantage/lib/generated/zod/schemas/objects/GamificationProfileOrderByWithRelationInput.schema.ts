import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './userOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  userId: SortOrderSchema.optional(),
  xp: SortOrderSchema.optional(),
  level: SortOrderSchema.optional(),
  streak: SortOrderSchema.optional(),
  lastActiveAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  user: z.lazy(() => userOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const GamificationProfileOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.GamificationProfileOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileOrderByWithRelationInput>;
export const GamificationProfileOrderByWithRelationInputObjectZodSchema = makeSchema();
