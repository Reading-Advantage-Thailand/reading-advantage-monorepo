import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { AttemptOrderByWithRelationInputObjectSchema as AttemptOrderByWithRelationInputObjectSchema } from './AttemptOrderByWithRelationInput.schema';
import { QuizQuestionOrderByWithRelationInputObjectSchema as QuizQuestionOrderByWithRelationInputObjectSchema } from './QuizQuestionOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  attemptId: SortOrderSchema.optional(),
  questionId: SortOrderSchema.optional(),
  studentAnswer: SortOrderSchema.optional(),
  isCorrect: SortOrderSchema.optional(),
  timeSpentSeconds: SortOrderSchema.optional(),
  answeredAt: SortOrderSchema.optional(),
  order: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  attempt: z.lazy(() => AttemptOrderByWithRelationInputObjectSchema).optional(),
  question: z.lazy(() => QuizQuestionOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const QuestionResponseOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.QuestionResponseOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseOrderByWithRelationInput>;
export const QuestionResponseOrderByWithRelationInputObjectZodSchema = makeSchema();
