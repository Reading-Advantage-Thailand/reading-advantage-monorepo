import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => LessonWhereInputObjectSchema).optional(),
  some: z.lazy(() => LessonWhereInputObjectSchema).optional(),
  none: z.lazy(() => LessonWhereInputObjectSchema).optional()
}).strict();
export const LessonListRelationFilterObjectSchema: z.ZodType<Prisma.LessonListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.LessonListRelationFilter>;
export const LessonListRelationFilterObjectZodSchema = makeSchema();
