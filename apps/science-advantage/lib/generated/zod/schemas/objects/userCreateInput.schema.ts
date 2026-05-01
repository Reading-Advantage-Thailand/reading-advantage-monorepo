import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { accountCreateNestedManyWithoutUserInputObjectSchema as accountCreateNestedManyWithoutUserInputObjectSchema } from './accountCreateNestedManyWithoutUserInput.schema';
import { sessionCreateNestedManyWithoutUserInputObjectSchema as sessionCreateNestedManyWithoutUserInputObjectSchema } from './sessionCreateNestedManyWithoutUserInput.schema';
import { ClassCreateNestedManyWithoutTeacherInputObjectSchema as ClassCreateNestedManyWithoutTeacherInputObjectSchema } from './ClassCreateNestedManyWithoutTeacherInput.schema';
import { ClassCreateNestedManyWithoutStudentsInputObjectSchema as ClassCreateNestedManyWithoutStudentsInputObjectSchema } from './ClassCreateNestedManyWithoutStudentsInput.schema';
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
  account: z.lazy(() => accountCreateNestedManyWithoutUserInputObjectSchema),
  session: z.lazy(() => sessionCreateNestedManyWithoutUserInputObjectSchema),
  taughtClasses: z.lazy(() => ClassCreateNestedManyWithoutTeacherInputObjectSchema),
  enrolledClass: z.lazy(() => ClassCreateNestedManyWithoutStudentsInputObjectSchema),
  attempts: z.lazy(() => AttemptCreateNestedManyWithoutStudentInputObjectSchema),
  lessonCompletions: z.lazy(() => LessonCompletionCreateNestedManyWithoutStudentInputObjectSchema),
  masteryRecords: z.lazy(() => StandardMasteryCreateNestedManyWithoutStudentInputObjectSchema),
  masteryRuns: z.lazy(() => MasteryRunCreateNestedManyWithoutStudentInputObjectSchema),
  gamificationProfile: z.lazy(() => GamificationProfileCreateNestedOneWithoutUserInputObjectSchema).optional(),
  achievements: z.lazy(() => AchievementCreateNestedManyWithoutUserInputObjectSchema),
  assignedLessons: z.lazy(() => AssignmentCreateNestedManyWithoutTeacherInputObjectSchema)
}).strict();
export const userCreateInputObjectSchema: z.ZodType<Prisma.userCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateInput>;
export const userCreateInputObjectZodSchema = makeSchema();
