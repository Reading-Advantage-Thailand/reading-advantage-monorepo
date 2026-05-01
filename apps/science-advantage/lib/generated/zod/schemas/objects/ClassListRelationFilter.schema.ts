import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './ClassWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => ClassWhereInputObjectSchema).optional(),
  some: z.lazy(() => ClassWhereInputObjectSchema).optional(),
  none: z.lazy(() => ClassWhereInputObjectSchema).optional()
}).strict();
export const ClassListRelationFilterObjectSchema: z.ZodType<Prisma.ClassListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.ClassListRelationFilter>;
export const ClassListRelationFilterObjectZodSchema = makeSchema();
