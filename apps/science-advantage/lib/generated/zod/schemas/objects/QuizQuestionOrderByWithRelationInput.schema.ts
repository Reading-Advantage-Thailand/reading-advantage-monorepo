import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { LessonOrderByWithRelationInputObjectSchema as LessonOrderByWithRelationInputObjectSchema } from './LessonOrderByWithRelationInput.schema';
import { StandardOrderByRelationAggregateInputObjectSchema as StandardOrderByRelationAggregateInputObjectSchema } from './StandardOrderByRelationAggregateInput.schema';
import { QuestionResponseOrderByRelationAggregateInputObjectSchema as QuestionResponseOrderByRelationAggregateInputObjectSchema } from './QuestionResponseOrderByRelationAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  type: SortOrderSchema.optional(),
  text: SortOrderSchema.optional(),
  options: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  correctAnswer: SortOrderSchema.optional(),
  points: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  version: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  lesson: z.lazy(() => LessonOrderByWithRelationInputObjectSchema).optional(),
  standards: z.lazy(() => StandardOrderByRelationAggregateInputObjectSchema).optional(),
  responses: z.lazy(() => QuestionResponseOrderByRelationAggregateInputObjectSchema).optional()
}).strict();
export const QuizQuestionOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.QuizQuestionOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionOrderByWithRelationInput>;
export const QuizQuestionOrderByWithRelationInputObjectZodSchema = makeSchema();
