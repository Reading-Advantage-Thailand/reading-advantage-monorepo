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
  account: z.lazy(() => accountUncheckedCreateNestedManyWithoutUserInputObjectSchema).optional(),
  session: z.lazy(() => sessionUncheckedCreateNestedManyWithoutUserInputObjectSchema).optional(),
  taughtClasses: z.lazy(() => ClassUncheckedCreateNestedManyWithoutTeacherInputObjectSchema).optional(),
  enrolledClass: z.lazy(() => ClassUncheckedCreateNestedManyWithoutStudentsInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptUncheckedCreateNestedManyWithoutStudentInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionUncheckedCreateNestedManyWithoutStudentInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryUncheckedCreateNestedManyWithoutStudentInputObjectSchema).optional(),
  gamificationProfile: z.lazy(() => GamificationProfileUncheckedCreateNestedOneWithoutUserInputObjectSchema).optional(),
  achievements: z.lazy(() => AchievementUncheckedCreateNestedManyWithoutUserInputObjectSchema).optional(),
  assignedLessons: z.lazy(() => AssignmentUncheckedCreateNestedManyWithoutTeacherInputObjectSchema).optional()
}).strict();
export const userUncheckedCreateWithoutMasteryRunsInputObjectSchema: z.ZodType<Prisma.userUncheckedCreateWithoutMasteryRunsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUncheckedCreateWithoutMasteryRunsInput>;
export const userUncheckedCreateWithoutMasteryRunsInputObjectZodSchema = makeSchema();
