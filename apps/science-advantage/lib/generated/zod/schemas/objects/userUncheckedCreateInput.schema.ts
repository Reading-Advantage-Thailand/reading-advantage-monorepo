import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { accountUncheckedCreateNestedManyWithoutUserInputObjectSchema as accountUncheckedCreateNestedManyWithoutUserInputObjectSchema } from './accountUncheckedCreateNestedManyWithoutUserInput.schema';
import { sessionUncheckedCreateNestedManyWithoutUserInputObjectSchema as sessionUncheckedCreateNestedManyWithoutUserInputObjectSchema } from './sessionUncheckedCreateNestedManyWithoutUserInput.schema';
import { ClassUncheckedCreateNestedManyWithoutTeacherInputObjectSchema as ClassUncheckedCreateNestedManyWithoutTeacherInputObjectSchema } from './ClassUncheckedCreateNestedManyWithoutTeacherInput.schema';
import { ClassUncheckedCreateNestedManyWithoutStudentsInputObjectSchema as ClassUncheckedCreateNestedManyWithoutStudentsInputObjectSchema } from './ClassUncheckedCreateNestedManyWithoutStudentsInput.schema';
import { AttemptUncheckedCreateNestedManyWithoutStudentInputObjectSchema as AttemptUncheckedCreateNestedManyWithoutStudentInputObjectSchema } from './AttemptUncheckedCreateNestedManyWithoutStudentInput.schema';
import { LessonCompletionUncheckedCreateNestedManyWithoutStudentInputObjectSchema as LessonCompletionUncheckedCreateNestedManyWithoutStudentInputObjectSchema } from './LessonCompletionUncheckedCreateNestedManyWithoutStudentInput.schema';
import { StandardMasteryUncheckedCreateNestedManyWithoutStudentInputObjectSchema as StandardMasteryUncheckedCreateNestedManyWithoutStudentInputObjectSchema } from './StandardMasteryUncheckedCreateNestedManyWithoutStudentInput.schema';
import { MasteryRunUncheckedCreateNestedManyWithoutStudentInputObjectSchema as MasteryRunUncheckedCreateNestedManyWithoutStudentInputObjectSchema } from './MasteryRunUncheckedCreateNestedManyWithoutStudentInput.schema';
import { GamificationProfileUncheckedCreateNestedOneWithoutUserInputObjectSchema as GamificationProfileUncheckedCreateNestedOneWithoutUserInputObjectSchema } from './GamificationProfileUncheckedCreateNestedOneWithoutUserInput.schema';
import { AchievementUncheckedCreateNestedManyWithoutUserInputObjectSchema as AchievementUncheckedCreateNestedManyWithoutUserInputObjectSchema } from './AchievementUncheckedCreateNestedManyWithoutUserInput.schema';
import { AssignmentUncheckedCreateNestedManyWithoutTeacherInputObjectSchema as AssignmentUncheckedCreateNestedManyWithoutTeacherInputObjectSchema } from './AssignmentUncheckedCreateNestedManyWithoutTeacherInput.schema'

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
  account: z.lazy(() => accountUncheckedCreateNestedManyWithoutUserInputObjectSchema),
  session: z.lazy(() => sessionUncheckedCreateNestedManyWithoutUserInputObjectSchema),
  taughtClasses: z.lazy(() => ClassUncheckedCreateNestedManyWithoutTeacherInputObjectSchema),
  enrolledClass: z.lazy(() => ClassUncheckedCreateNestedManyWithoutStudentsInputObjectSchema),
  attempts: z.lazy(() => AttemptUncheckedCreateNestedManyWithoutStudentInputObjectSchema),
  lessonCompletions: z.lazy(() => LessonCompletionUncheckedCreateNestedManyWithoutStudentInputObjectSchema),
  masteryRecords: z.lazy(() => StandardMasteryUncheckedCreateNestedManyWithoutStudentInputObjectSchema),
  masteryRuns: z.lazy(() => MasteryRunUncheckedCreateNestedManyWithoutStudentInputObjectSchema),
  gamificationProfile: z.lazy(() => GamificationProfileUncheckedCreateNestedOneWithoutUserInputObjectSchema).optional(),
  achievements: z.lazy(() => AchievementUncheckedCreateNestedManyWithoutUserInputObjectSchema),
  assignedLessons: z.lazy(() => AssignmentUncheckedCreateNestedManyWithoutTeacherInputObjectSchema)
}).strict();
export const userUncheckedCreateInputObjectSchema: z.ZodType<Prisma.userUncheckedCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.userUncheckedCreateInput>;
export const userUncheckedCreateInputObjectZodSchema = makeSchema();
