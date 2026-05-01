import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutAssignedLessonsInputObjectSchema as userUpdateWithoutAssignedLessonsInputObjectSchema } from './userUpdateWithoutAssignedLessonsInput.schema';
import { userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema as userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema } from './userUncheckedUpdateWithoutAssignedLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutAssignedLessonsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutAssignedLessonsInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutAssignedLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutAssignedLessonsInput>;
export const userUpdateToOneWithWhereWithoutAssignedLessonsInputObjectZodSchema = makeSchema();
