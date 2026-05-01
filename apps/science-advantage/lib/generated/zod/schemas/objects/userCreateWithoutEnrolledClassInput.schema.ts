import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { accountCreateNestedManyWithoutUserInputObjectSchema as accountCreateNestedManyWithoutUserInputObjectSchema } from './accountCreateNestedManyWithoutUserInput.schema';
import { sessionCreateNestedManyWithoutUserInputObjectSchema as sessionCreateNestedManyWithoutUserInputObjectSchema } from './sessionCreateNestedManyWithoutUserInput.schema';
import { ClassCreateNestedManyWithoutTeacherInputObjectSchema as ClassCreateNestedManyWithoutTeacherInputObjectSchema } from './ClassCreateNestedManyWithoutTeacherInput.schema';
import { AttemptCreateNestedManyWithoutStudentInputObjectSchema as AttemptCreateNestedManyWithoutStudentInputObjectSchema } from './AttemptCreateNestedManyWithoutStudentInput.schema';
import { LessonCompletionCreateNestedManyWithoutStudentInputObjectSchema as LessonCompletionCreateNestedManyWithoutStudentInputObjectSchema } from './LessonCompletionCreateNestedManyWithoutStudentInput.schema';
import { StandardMasteryCreateNestedManyWithoutStudentInputObjectSchema as StandardMasteryCreateNestedManyWithoutStudentInputObjectSchema } from './StandardMasteryCreateNestedManyWithoutStudentInput.schema';
import { MasteryRunCreateNestedManyWithoutStudentInputObjectSchema as MasteryRunCreateNestedManyWithoutStudentInputObjectSchema } from './MasteryRunCreateNestedManyWithoutStudentInput.schema';
import { GamificationProfileCreateNestedOneWithoutUserInputObjectSchema as GamificationProfileCreateNestedOneWithoutUserInputObjectSchema } from './GamificationProfileCreateNestedOneWithoutUserInput.schema';
import { AchievementCreateNestedManyWithoutUserInputObjectSchema as AchievementCreateNestedManyWithoutUserInputObjectSchema } from './AchievementCreateNestedManyWithoutUserInput.schema';
import { AssignmentCreateNestedManyWithoutTeacherInputObjectSchema as AssignmentCreateNestedManyWithoutTeacherInputObjectSchema } from './AssignmentCreateNestedManyWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  displayUsername: z.string(),
  email: z.string().optional().nullable(),
  emailVerified: z.boolean().optional(),
  image: z.string().optional().nullable(),
  role: UserRoleSchema.optional(),
  gradeLevel: z.number().int().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  account: z.lazy(() => accountCreateNestedManyWithoutUserInputObjectSchema).optional(),
  session: z.lazy(() => sessionCreateNestedManyWithoutUserInputObjectSchema).optional(),
  taughtClasses: z.lazy(() => ClassCreateNestedManyWithoutTeacherInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptCreateNestedManyWithoutStudentInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionCreateNestedManyWithoutStudentInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryCreateNestedManyWithoutStudentInputObjectSchema).optional(),
  masteryRuns: z.lazy(() => MasteryRunCreateNestedManyWithoutStudentInputObjectSchema).optional(),
  gamificationProfile: z.lazy(() => GamificationProfileCreateNestedOneWithoutUserInputObjectSchema).optional(),
  achievements: z.lazy(() => AchievementCreateNestedManyWithoutUserInputObjectSchema).optional(),
  assignedLessons: z.lazy(() => AssignmentCreateNestedManyWithoutTeacherInputObjectSchema).optional()
}).strict();
export const userCreateWithoutEnrolledClassInputObjectSchema: z.ZodType<Prisma.userCreateWithoutEnrolledClassInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateWithoutEnrolledClassInput>;
export const userCreateWithoutEnrolledClassInputObjectZodSchema = makeSchema();
