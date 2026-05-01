import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { SortOrderInputObjectSchema as SortOrderInputObjectSchema } from './SortOrderInput.schema';
import { accountOrderByRelationAggregateInputObjectSchema as accountOrderByRelationAggregateInputObjectSchema } from './accountOrderByRelationAggregateInput.schema';
import { sessionOrderByRelationAggregateInputObjectSchema as sessionOrderByRelationAggregateInputObjectSchema } from './sessionOrderByRelationAggregateInput.schema';
import { ClassOrderByRelationAggregateInputObjectSchema as ClassOrderByRelationAggregateInputObjectSchema } from './ClassOrderByRelationAggregateInput.schema';
import { AttemptOrderByRelationAggregateInputObjectSchema as AttemptOrderByRelationAggregateInputObjectSchema } from './AttemptOrderByRelationAggregateInput.schema';
import { LessonCompletionOrderByRelationAggregateInputObjectSchema as LessonCompletionOrderByRelationAggregateInputObjectSchema } from './LessonCompletionOrderByRelationAggregateInput.schema';
import { StandardMasteryOrderByRelationAggregateInputObjectSchema as StandardMasteryOrderByRelationAggregateInputObjectSchema } from './StandardMasteryOrderByRelationAggregateInput.schema';
import { MasteryRunOrderByRelationAggregateInputObjectSchema as MasteryRunOrderByRelationAggregateInputObjectSchema } from './MasteryRunOrderByRelationAggregateInput.schema';
import { GamificationProfileOrderByWithRelationInputObjectSchema as GamificationProfileOrderByWithRelationInputObjectSchema } from './GamificationProfileOrderByWithRelationInput.schema';
import { AchievementOrderByRelationAggregateInputObjectSchema as AchievementOrderByRelationAggregateInputObjectSchema } from './AchievementOrderByRelationAggregateInput.schema';
import { AssignmentOrderByRelationAggregateInputObjectSchema as AssignmentOrderByRelationAggregateInputObjectSchema } from './AssignmentOrderByRelationAggregateInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  name: SortOrderSchema.optional(),
  username: SortOrderSchema.optional(),
  displayUsername: SortOrderSchema.optional(),
  email: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  emailVerified: SortOrderSchema.optional(),
  image: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  role: SortOrderSchema.optional(),
  gradeLevel: z.union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)]).optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  account: z.lazy(() => accountOrderByRelationAggregateInputObjectSchema).optional(),
  session: z.lazy(() => sessionOrderByRelationAggregateInputObjectSchema).optional(),
  taughtClasses: z.lazy(() => ClassOrderByRelationAggregateInputObjectSchema).optional(),
  enrolledClass: z.lazy(() => ClassOrderByRelationAggregateInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptOrderByRelationAggregateInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionOrderByRelationAggregateInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryOrderByRelationAggregateInputObjectSchema).optional(),
  masteryRuns: z.lazy(() => MasteryRunOrderByRelationAggregateInputObjectSchema).optional(),
  gamificationProfile: z.lazy(() => GamificationProfileOrderByWithRelationInputObjectSchema).optional(),
  achievements: z.lazy(() => AchievementOrderByRelationAggregateInputObjectSchema).optional(),
  assignedLessons: z.lazy(() => AssignmentOrderByRelationAggregateInputObjectSchema).optional()
}).strict();
export const userOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.userOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.userOrderByWithRelationInput>;
export const userOrderByWithRelationInputObjectZodSchema = makeSchema();
