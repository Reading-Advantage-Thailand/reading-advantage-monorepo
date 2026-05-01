import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './StandardWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => StandardWhereInputObjectSchema).optional(),
  some: z.lazy(() => StandardWhereInputObjectSchema).optional(),
  none: z.lazy(() => StandardWhereInputObjectSchema).optional()
}).strict();
export const StandardListRelationFilterObjectSchema: z.ZodType<Prisma.StandardListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.StandardListRelationFilter>;
export const StandardListRelationFilterObjectZodSchema = makeSchema();
