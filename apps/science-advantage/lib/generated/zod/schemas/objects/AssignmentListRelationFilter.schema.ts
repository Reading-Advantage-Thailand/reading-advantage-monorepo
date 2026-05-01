import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereInputObjectSchema as AssignmentWhereInputObjectSchema } from './AssignmentWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => AssignmentWhereInputObjectSchema).optional(),
  some: z.lazy(() => AssignmentWhereInputObjectSchema).optional(),
  none: z.lazy(() => AssignmentWhereInputObjectSchema).optional()
}).strict();
export const AssignmentListRelationFilterObjectSchema: z.ZodType<Prisma.AssignmentListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentListRelationFilter>;
export const AssignmentListRelationFilterObjectZodSchema = makeSchema();
