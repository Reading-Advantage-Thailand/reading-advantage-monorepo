import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './QuizQuestionWhereInput.schema'

const makeSchema = () => z.object({
  is: z.lazy(() => QuizQuestionWhereInputObjectSchema).optional(),
  isNot: z.lazy(() => QuizQuestionWhereInputObjectSchema).optional()
}).strict();
export const QuizQuestionScalarRelationFilterObjectSchema: z.ZodType<Prisma.QuizQuestionScalarRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionScalarRelationFilter>;
export const QuizQuestionScalarRelationFilterObjectZodSchema = makeSchema();
