import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereInputObjectSchema as AttemptWhereInputObjectSchema } from './AttemptWhereInput.schema'

const makeSchema = () => z.object({
  is: z.lazy(() => AttemptWhereInputObjectSchema).optional(),
  isNot: z.lazy(() => AttemptWhereInputObjectSchema).optional()
}).strict();
export const AttemptScalarRelationFilterObjectSchema: z.ZodType<Prisma.AttemptScalarRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.AttemptScalarRelationFilter>;
export const AttemptScalarRelationFilterObjectZodSchema = makeSchema();
