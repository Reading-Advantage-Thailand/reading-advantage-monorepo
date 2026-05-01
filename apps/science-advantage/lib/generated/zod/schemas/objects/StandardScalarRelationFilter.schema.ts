import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './StandardWhereInput.schema'

const makeSchema = () => z.object({
  is: z.lazy(() => StandardWhereInputObjectSchema).optional(),
  isNot: z.lazy(() => StandardWhereInputObjectSchema).optional()
}).strict();
export const StandardScalarRelationFilterObjectSchema: z.ZodType<Prisma.StandardScalarRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.StandardScalarRelationFilter>;
export const StandardScalarRelationFilterObjectZodSchema = makeSchema();
