import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './ClassWhereInput.schema'

const makeSchema = () => z.object({
  is: z.lazy(() => ClassWhereInputObjectSchema).optional(),
  isNot: z.lazy(() => ClassWhereInputObjectSchema).optional()
}).strict();
export const ClassScalarRelationFilterObjectSchema: z.ZodType<Prisma.ClassScalarRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.ClassScalarRelationFilter>;
export const ClassScalarRelationFilterObjectZodSchema = makeSchema();
