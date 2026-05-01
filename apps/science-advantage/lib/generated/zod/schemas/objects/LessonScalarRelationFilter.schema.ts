import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema'

const makeSchema = () => z.object({
  is: z.lazy(() => LessonWhereInputObjectSchema).optional(),
  isNot: z.lazy(() => LessonWhereInputObjectSchema).optional()
}).strict();
export const LessonScalarRelationFilterObjectSchema: z.ZodType<Prisma.LessonScalarRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.LessonScalarRelationFilter>;
export const LessonScalarRelationFilterObjectZodSchema = makeSchema();
