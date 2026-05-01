import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './userOrderByWithRelationInput.schema';
import { LessonOrderByWithRelationInputObjectSchema as LessonOrderByWithRelationInputObjectSchema } from './LessonOrderByWithRelationInput.schema';
import { QuestionResponseOrderByRelationAggregateInputObjectSchema as QuestionResponseOrderByRelationAggregateInputObjectSchema } from './QuestionResponseOrderByRelationAggregateInput.schema';
import { MasteryRunOrderByWithRelationInputObjectSchema as MasteryRunOrderByWithRelationInputObjectSchema } from './MasteryRunOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  score: SortOrderSchema.optional(),
  maxScore: SortOrderSchema.optional(),
  attemptNumber: SortOrderSchema.optional(),
  startedAt: SortOrderSchema.optional(),
  completedAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  student: z.lazy(() => userOrderByWithRelationInputObjectSchema).optional(),
  lesson: z.lazy(() => LessonOrderByWithRelationInputObjectSchema).optional(),
  questionResponses: z.lazy(() => QuestionResponseOrderByRelationAggregateInputObjectSchema).optional(),
  masteryRun: z.lazy(() => MasteryRunOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const AttemptOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.AttemptOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptOrderByWithRelationInput>;
export const AttemptOrderByWithRelationInputObjectZodSchema = makeSchema();
