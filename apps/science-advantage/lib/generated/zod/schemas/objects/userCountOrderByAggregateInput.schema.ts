import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  name: SortOrderSchema.optional(),
  username: SortOrderSchema.optional(),
  displayUsername: SortOrderSchema.optional(),
  email: SortOrderSchema.optional(),
  emailVerified: SortOrderSchema.optional(),
  image: SortOrderSchema.optional(),
  role: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const userCountOrderByAggregateInputObjectSchema: z.ZodType<Prisma.userCountOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.userCountOrderByAggregateInput>;
export const userCountOrderByAggregateInputObjectZodSchema = makeSchema();
