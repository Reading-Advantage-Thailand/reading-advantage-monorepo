import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { userOrderByWithRelationInputObjectSchema as userOrderByWithRelationInputObjectSchema } from './userOrderByWithRelationInput.schema';
import { LessonOrderByWithRelationInputObjectSchema as LessonOrderByWithRelationInputObjectSchema } from './LessonOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  status: SortOrderSchema.optional(),
  completedAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  attemptsCount: SortOrderSchema.optional(),
  bestScore: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  bestScorePercentage: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  mostRecentScore: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  mostRecentScorePercentage: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  totalTimeSpentSeconds: SortOrderSchema.optional(),
  lastAttemptAt: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  student: z.lazy(() => userOrderByWithRelationInputObjectSchema).optional(),
  lesson: z.lazy(() => LessonOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const LessonCompletionOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.LessonCompletionOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionOrderByWithRelationInput>;
export const LessonCompletionOrderByWithRelationInputObjectZodSchema = makeSchema();
