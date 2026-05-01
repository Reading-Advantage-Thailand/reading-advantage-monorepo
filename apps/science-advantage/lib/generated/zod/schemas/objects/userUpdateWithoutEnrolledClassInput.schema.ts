import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { NullableStringFieldUpdateOperationsInputObjectSchema as NullableStringFieldUpdateOperationsInputObjectSchema } from './NullableStringFieldUpdateOperationsInput.schema';
import { BoolFieldUpdateOperationsInputObjectSchema as BoolFieldUpdateOperationsInputObjectSchema } from './BoolFieldUpdateOperationsInput.schema';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { EnumUserRoleFieldUpdateOperationsInputObjectSchema as EnumUserRoleFieldUpdateOperationsInputObjectSchema } from './EnumUserRoleFieldUpdateOperationsInput.schema';
import { NullableIntFieldUpdateOperationsInputObjectSchema as NullableIntFieldUpdateOperationsInputObjectSchema } from './NullableIntFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { accountUpdateManyWithoutUserNestedInputObjectSchema as accountUpdateManyWithoutUserNestedInputObjectSchema } from './accountUpdateManyWithoutUserNestedInput.schema';
import { sessionUpdateManyWithoutUserNestedInputObjectSchema as sessionUpdateManyWithoutUserNestedInputObjectSchema } from './sessionUpdateManyWithoutUserNestedInput.schema';
import { ClassUpdateManyWithoutTeacherNestedInputObjectSchema as ClassUpdateManyWithoutTeacherNestedInputObjectSchema } from './ClassUpdateManyWithoutTeacherNestedInput.schema';
import { AttemptUpdateManyWithoutStudentNestedInputObjectSchema as AttemptUpdateManyWithoutStudentNestedInputObjectSchema } from './AttemptUpdateManyWithoutStudentNestedInput.schema';
import { LessonCompletionUpdateManyWithoutStudentNestedInputObjectSchema as LessonCompletionUpdateManyWithoutStudentNestedInputObjectSchema } from './LessonCompletionUpdateManyWithoutStudentNestedInput.schema';
import { StandardMasteryUpdateManyWithoutStudentNestedInputObjectSchema as StandardMasteryUpdateManyWithoutStudentNestedInputObjectSchema } from './StandardMasteryUpdateManyWithoutStudentNestedInput.schema';
import { MasteryRunUpdateManyWithoutStudentNestedInputObjectSchema as MasteryRunUpdateManyWithoutStudentNestedInputObjectSchema } from './MasteryRunUpdateManyWithoutStudentNestedInput.schema';
import { GamificationProfileUpdateOneWithoutUserNestedInputObjectSchema as GamificationProfileUpdateOneWithoutUserNestedInputObjectSchema } from './GamificationProfileUpdateOneWithoutUserNestedInput.schema';
import { AchievementUpdateManyWithoutUserNestedInputObjectSchema as AchievementUpdateManyWithoutUserNestedInputObjectSchema } from './AchievementUpdateManyWithoutUserNestedInput.schema';
import { AssignmentUpdateManyWithoutTeacherNestedInputObjectSchema as AssignmentUpdateManyWithoutTeacherNestedInputObjectSchema } from './AssignmentUpdateManyWithoutTeacherNestedInput.schema'

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
  account: z.lazy(() => accountUpdateManyWithoutUserNestedInputObjectSchema).optional(),
  session: z.lazy(() => sessionUpdateManyWithoutUserNestedInputObjectSchema).optional(),
  taughtClasses: z.lazy(() => ClassUpdateManyWithoutTeacherNestedInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptUpdateManyWithoutStudentNestedInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionUpdateManyWithoutStudentNestedInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryUpdateManyWithoutStudentNestedInputObjectSchema).optional(),
  masteryRuns: z.lazy(() => MasteryRunUpdateManyWithoutStudentNestedInputObjectSchema).optional(),
  gamificationProfile: z.lazy(() => GamificationProfileUpdateOneWithoutUserNestedInputObjectSchema).optional(),
  achievements: z.lazy(() => AchievementUpdateManyWithoutUserNestedInputObjectSchema).optional(),
  assignedLessons: z.lazy(() => AssignmentUpdateManyWithoutTeacherNestedInputObjectSchema).optional()
}).strict();
export const userUpdateWithoutEnrolledClassInputObjectSchema: z.ZodType<Prisma.userUpdateWithoutEnrolledClassInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateWithoutEnrolledClassInput>;
export const userUpdateWithoutEnrolledClassInputObjectZodSchema = makeSchema();
