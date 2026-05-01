import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutAssignedLessonsInputObjectSchema as userUpdateWithoutAssignedLessonsInputObjectSchema } from './userUpdateWithoutAssignedLessonsInput.schema';
import { userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema as userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema } from './userUncheckedUpdateWithoutAssignedLessonsInput.schema';
import { userCreateWithoutAssignedLessonsInputObjectSchema as userCreateWithoutAssignedLessonsInputObjectSchema } from './userCreateWithoutAssignedLessonsInput.schema';
import { userUncheckedCreateWithoutAssignedLessonsInputObjectSchema as userUncheckedCreateWithoutAssignedLessonsInputObjectSchema } from './userUncheckedCreateWithoutAssignedLessonsInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutAssignedLessonsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutAssignedLessonsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAssignedLessonsInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutAssignedLessonsInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutAssignedLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutAssignedLessonsInput>;
export const userUpsertWithoutAssignedLessonsInputObjectZodSchema = makeSchema();
