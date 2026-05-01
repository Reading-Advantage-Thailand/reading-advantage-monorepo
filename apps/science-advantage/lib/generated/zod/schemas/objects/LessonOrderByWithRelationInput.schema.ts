import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { StandardOrderByRelationAggregateInputObjectSchema as StandardOrderByRelationAggregateInputObjectSchema } from './StandardOrderByRelationAggregateInput.schema';
import { CurriculumUnitOrderByRelationAggregateInputObjectSchema as CurriculumUnitOrderByRelationAggregateInputObjectSchema } from './CurriculumUnitOrderByRelationAggregateInput.schema';
import { QuizQuestionOrderByRelationAggregateInputObjectSchema as QuizQuestionOrderByRelationAggregateInputObjectSchema } from './QuizQuestionOrderByRelationAggregateInput.schema';
import { AttemptOrderByRelationAggregateInputObjectSchema as AttemptOrderByRelationAggregateInputObjectSchema } from './AttemptOrderByRelationAggregateInput.schema';
import { LessonCompletionOrderByRelationAggregateInputObjectSchema as LessonCompletionOrderByRelationAggregateInputObjectSchema } from './LessonCompletionOrderByRelationAggregateInput.schema';
import { AssignmentOrderByRelationAggregateInputObjectSchema as AssignmentOrderByRelationAggregateInputObjectSchema } from './AssignmentOrderByRelationAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  slug: SortOrderSchema.optional(),
  title: SortOrderSchema.optional(),
  titleThai: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  description: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  descriptionThai: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  content: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  structuredContent: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  lessonType: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional(),
  order: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  standards: z.lazy(() => StandardOrderByRelationAggregateInputObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitOrderByRelationAggregateInputObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionOrderByRelationAggregateInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptOrderByRelationAggregateInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionOrderByRelationAggregateInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentOrderByRelationAggregateInputObjectSchema).optional()
}).strict();
export const LessonOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.LessonOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonOrderByWithRelationInput>;
export const LessonOrderByWithRelationInputObjectZodSchema = makeSchema();
