import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './QuizQuestionWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => QuizQuestionWhereInputObjectSchema).optional(),
  some: z.lazy(() => QuizQuestionWhereInputObjectSchema).optional(),
  none: z.lazy(() => QuizQuestionWhereInputObjectSchema).optional()
}).strict();
export const QuizQuestionListRelationFilterObjectSchema: z.ZodType<Prisma.QuizQuestionListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionListRelationFilter>;
export const QuizQuestionListRelationFilterObjectZodSchema = makeSchema();
