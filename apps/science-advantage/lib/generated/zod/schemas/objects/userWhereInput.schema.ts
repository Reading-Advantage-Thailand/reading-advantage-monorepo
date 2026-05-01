import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { BoolFilterObjectSchema as BoolFilterObjectSchema } from './BoolFilter.schema';
import { EnumUserRoleFilterObjectSchema as EnumUserRoleFilterObjectSchema } from './EnumUserRoleFilter.schema';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { IntNullableFilterObjectSchema as IntNullableFilterObjectSchema } from './IntNullableFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { AccountListRelationFilterObjectSchema as AccountListRelationFilterObjectSchema } from './AccountListRelationFilter.schema';
import { SessionListRelationFilterObjectSchema as SessionListRelationFilterObjectSchema } from './SessionListRelationFilter.schema';
import { ClassListRelationFilterObjectSchema as ClassListRelationFilterObjectSchema } from './ClassListRelationFilter.schema';
import { AttemptListRelationFilterObjectSchema as AttemptListRelationFilterObjectSchema } from './AttemptListRelationFilter.schema';
import { LessonCompletionListRelationFilterObjectSchema as LessonCompletionListRelationFilterObjectSchema } from './LessonCompletionListRelationFilter.schema';
import { StandardMasteryListRelationFilterObjectSchema as StandardMasteryListRelationFilterObjectSchema } from './StandardMasteryListRelationFilter.schema';
import { MasteryRunListRelationFilterObjectSchema as MasteryRunListRelationFilterObjectSchema } from './MasteryRunListRelationFilter.schema';
import { GamificationProfileNullableScalarRelationFilterObjectSchema as GamificationProfileNullableScalarRelationFilterObjectSchema } from './GamificationProfileNullableScalarRelationFilter.schema';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './GamificationProfileWhereInput.schema';
import { AchievementListRelationFilterObjectSchema as AchievementListRelationFilterObjectSchema } from './AchievementListRelationFilter.schema';
import { AssignmentListRelationFilterObjectSchema as AssignmentListRelationFilterObjectSchema } from './AssignmentListRelationFilter.schema'

const userwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => userWhereInputObjectSchema), z.lazy(() => userWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => userWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => userWhereInputObjectSchema), z.lazy(() => userWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  name: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  username: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  displayUsername: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  email: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  emailVerified: z.union([z.lazy(() => BoolFilterObjectSchema), z.boolean()]).optional(),
  image: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  role: z.union([z.lazy(() => EnumUserRoleFilterObjectSchema), UserRoleSchema]).optional(),
  gradeLevel: z.union([z.lazy(() => IntNullableFilterObjectSchema), z.number().int()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  account: z.lazy(() => AccountListRelationFilterObjectSchema).optional(),
  session: z.lazy(() => SessionListRelationFilterObjectSchema).optional(),
  taughtClasses: z.lazy(() => ClassListRelationFilterObjectSchema).optional(),
  enrolledClass: z.lazy(() => ClassListRelationFilterObjectSchema).optional(),
  attempts: z.lazy(() => AttemptListRelationFilterObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionListRelationFilterObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryListRelationFilterObjectSchema).optional(),
  masteryRuns: z.lazy(() => MasteryRunListRelationFilterObjectSchema).optional(),
  gamificationProfile: z.union([z.lazy(() => GamificationProfileNullableScalarRelationFilterObjectSchema), z.lazy(() => GamificationProfileWhereInputObjectSchema)]).optional(),
  achievements: z.lazy(() => AchievementListRelationFilterObjectSchema).optional(),
  assignedLessons: z.lazy(() => AssignmentListRelationFilterObjectSchema).optional()
}).strict();
export const userWhereInputObjectSchema: z.ZodType<Prisma.userWhereInput> = userwhereinputSchema as unknown as z.ZodType<Prisma.userWhereInput>;
export const userWhereInputObjectZodSchema = userwhereinputSchema;
