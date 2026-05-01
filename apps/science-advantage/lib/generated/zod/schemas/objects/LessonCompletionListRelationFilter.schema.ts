import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionWhereInputObjectSchema as LessonCompletionWhereInputObjectSchema } from './LessonCompletionWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => LessonCompletionWhereInputObjectSchema).optional(),
  some: z.lazy(() => LessonCompletionWhereInputObjectSchema).optional(),
  none: z.lazy(() => LessonCompletionWhereInputObjectSchema).optional()
}).strict();
export const LessonCompletionListRelationFilterObjectSchema: z.ZodType<Prisma.LessonCompletionListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionListRelationFilter>;
export const LessonCompletionListRelationFilterObjectZodSchema = makeSchema();
