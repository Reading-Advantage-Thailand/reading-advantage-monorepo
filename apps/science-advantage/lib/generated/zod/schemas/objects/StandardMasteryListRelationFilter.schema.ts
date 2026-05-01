import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryWhereInputObjectSchema as StandardMasteryWhereInputObjectSchema } from './StandardMasteryWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => StandardMasteryWhereInputObjectSchema).optional(),
  some: z.lazy(() => StandardMasteryWhereInputObjectSchema).optional(),
  none: z.lazy(() => StandardMasteryWhereInputObjectSchema).optional()
}).strict();
export const StandardMasteryListRelationFilterObjectSchema: z.ZodType<Prisma.StandardMasteryListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryListRelationFilter>;
export const StandardMasteryListRelationFilterObjectZodSchema = makeSchema();
