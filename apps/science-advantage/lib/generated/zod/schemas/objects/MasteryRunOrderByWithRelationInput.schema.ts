import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { AttemptOrderByWithRelationInputObjectSchema as AttemptOrderByWithRelationInputObjectSchema } from './AttemptOrderByWithRelationInput.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './userOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  attemptId: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  status: SortOrderSchema.optional(),
  updatedCount: SortOrderSchema.optional(),
  lastError: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  attempt: z.lazy(() => AttemptOrderByWithRelationInputObjectSchema).optional(),
  student: z.lazy(() => userOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const MasteryRunOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.MasteryRunOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunOrderByWithRelationInput>;
export const MasteryRunOrderByWithRelationInputObjectZodSchema = makeSchema();
