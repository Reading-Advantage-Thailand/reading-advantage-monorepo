import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseWhereInputObjectSchema as QuestionResponseWhereInputObjectSchema } from './QuestionResponseWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => QuestionResponseWhereInputObjectSchema).optional(),
  some: z.lazy(() => QuestionResponseWhereInputObjectSchema).optional(),
  none: z.lazy(() => QuestionResponseWhereInputObjectSchema).optional()
}).strict();
export const QuestionResponseListRelationFilterObjectSchema: z.ZodType<Prisma.QuestionResponseListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseListRelationFilter>;
export const QuestionResponseListRelationFilterObjectZodSchema = makeSchema();
