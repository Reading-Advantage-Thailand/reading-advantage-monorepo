import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { NullableStringFieldUpdateOperationsInputObjectSchema as NullableStringFieldUpdateOperationsInputObjectSchema } from './NullableStringFieldUpdateOperationsInput.schema';
import { BoolFieldUpdateOperationsInputObjectSchema as BoolFieldUpdateOperationsInputObjectSchema } from './BoolFieldUpdateOperationsInput.schema';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { EnumUserRoleFieldUpdateOperationsInputObjectSchema as EnumUserRoleFieldUpdateOperationsInputObjectSchema } from './EnumUserRoleFieldUpdateOperationsInput.schema';
import { NullableIntFieldUpdateOperationsInputObjectSchema as NullableIntFieldUpdateOperationsInputObjectSchema } from './NullableIntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { accountUncheckedUpdateManyWithoutUserNestedInputObjectSchema as accountUncheckedUpdateManyWithoutUserNestedInputObjectSchema } from './accountUncheckedUpdateManyWithoutUserNestedInput.schema';
import { sessionUncheckedUpdateManyWithoutUserNestedInputObjectSchema as sessionUncheckedUpdateManyWithoutUserNestedInputObjectSchema } from './sessionUncheckedUpdateManyWithoutUserNestedInput.schema';
import { ClassUncheckedUpdateManyWithoutTeacherNestedInputObjectSchema as ClassUncheckedUpdateManyWithoutTeacherNestedInputObjectSchema } from './ClassUncheckedUpdateManyWithoutTeacherNestedInput.schema';
import { ClassUncheckedUpdateManyWithoutStudentsNestedInputObjectSchema as ClassUncheckedUpdateManyWithoutStudentsNestedInputObjectSchema } from './ClassUncheckedUpdateManyWithoutStudentsNestedInput.schema';
import { AttemptUncheckedUpdateManyWithoutStudentNestedInputObjectSchema as AttemptUncheckedUpdateManyWithoutStudentNestedInputObjectSchema } from './AttemptUncheckedUpdateManyWithoutStudentNestedInput.schema';
import { LessonCompletionUncheckedUpdateManyWithoutStudentNestedInputObjectSchema as LessonCompletionUncheckedUpdateManyWithoutStudentNestedInputObjectSchema } from './LessonCompletionUncheckedUpdateManyWithoutStudentNestedInput.schema';
import { StandardMasteryUncheckedUpdateManyWithoutStudentNestedInputObjectSchema as StandardMasteryUncheckedUpdateManyWithoutStudentNestedInputObjectSchema } from './StandardMasteryUncheckedUpdateManyWithoutStudentNestedInput.schema';
import { MasteryRunUncheckedUpdateManyWithoutStudentNestedInputObjectSchema as MasteryRunUncheckedUpdateManyWithoutStudentNestedInputObjectSchema } from './MasteryRunUncheckedUpdateManyWithoutStudentNestedInput.schema';
import { GamificationProfileUncheckedUpdateOneWithoutUserNestedInputObjectSchema as GamificationProfileUncheckedUpdateOneWithoutUserNestedInputObjectSchema } from './GamificationProfileUncheckedUpdateOneWithoutUserNestedInput.schema';
import { AchievementUncheckedUpdateManyWithoutUserNestedInputObjectSchema as AchievementUncheckedUpdateManyWithoutUserNestedInputObjectSchema } from './AchievementUncheckedUpdateManyWithoutUserNestedInput.schema';
import { AssignmentUncheckedUpdateManyWithoutTeacherNestedInputObjectSchema as AssignmentUncheckedUpdateManyWithoutTeacherNestedInputObjectSchema } from './AssignmentUncheckedUpdateManyWithoutTeacherNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  name: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  username: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  displayUsername: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  email: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  emailVerified: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputObjectSchema)]).optional(),
  image: z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  role: z.union([UserRoleSchema, z.lazy(() => EnumUserRoleFieldUpdateOperationsInputObjectSchema)]).optional(),
  gradeLevel: z.union([z.number().int(), z.lazy(() => NullableIntFieldUpdateOperationsInputObjectSchema)]).optional().nullable(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  account: z.lazy(() => accountUncheckedUpdateManyWithoutUserNestedInputObjectSchema).optional(),
  session: z.lazy(() => sessionUncheckedUpdateManyWithoutUserNestedInputObjectSchema).optional(),
  taughtClasses: z.lazy(() => ClassUncheckedUpdateManyWithoutTeacherNestedInputObjectSchema).optional(),
  enrolledClass: z.lazy(() => ClassUncheckedUpdateManyWithoutStudentsNestedInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptUncheckedUpdateManyWithoutStudentNestedInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionUncheckedUpdateManyWithoutStudentNestedInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryUncheckedUpdateManyWithoutStudentNestedInputObjectSchema).optional(),
  masteryRuns: z.lazy(() => MasteryRunUncheckedUpdateManyWithoutStudentNestedInputObjectSchema).optional(),
  gamificationProfile: z.lazy(() => GamificationProfileUncheckedUpdateOneWithoutUserNestedInputObjectSchema).optional(),
  achievements: z.lazy(() => AchievementUncheckedUpdateManyWithoutUserNestedInputObjectSchema).optional(),
  assignedLessons: z.lazy(() => AssignmentUncheckedUpdateManyWithoutTeacherNestedInputObjectSchema).optional()
}).strict();
export const userUncheckedUpdateInputObjectSchema: z.ZodType<Prisma.userUncheckedUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.userUncheckedUpdateInput>;
export const userUncheckedUpdateInputObjectZodSchema = makeSchema();
