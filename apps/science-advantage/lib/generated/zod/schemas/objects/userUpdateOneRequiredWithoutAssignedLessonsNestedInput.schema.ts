import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutAssignedLessonsInputObjectSchema as userCreateWithoutAssignedLessonsInputObjectSchema } from './userCreateWithoutAssignedLessonsInput.schema';
import { userUncheckedCreateWithoutAssignedLessonsInputObjectSchema as userUncheckedCreateWithoutAssignedLessonsInputObjectSchema } from './userUncheckedCreateWithoutAssignedLessonsInput.schema';
import { userCreateOrConnectWithoutAssignedLessonsInputObjectSchema as userCreateOrConnectWithoutAssignedLessonsInputObjectSchema } from './userCreateOrConnectWithoutAssignedLessonsInput.schema';
import { userUpsertWithoutAssignedLessonsInputObjectSchema as userUpsertWithoutAssignedLessonsInputObjectSchema } from './userUpsertWithoutAssignedLessonsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutAssignedLessonsInputObjectSchema as userUpdateToOneWithWhereWithoutAssignedLessonsInputObjectSchema } from './userUpdateToOneWithWhereWithoutAssignedLessonsInput.schema';
import { userUpdateWithoutAssignedLessonsInputObjectSchema as userUpdateWithoutAssignedLessonsInputObjectSchema } from './userUpdateWithoutAssignedLessonsInput.schema';
import { userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema as userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema } from './userUncheckedUpdateWithoutAssignedLessonsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutAssignedLessonsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAssignedLessonsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutAssignedLessonsInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutAssignedLessonsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutAssignedLessonsInputObjectSchema), z.lazy(() => userUpdateWithoutAssignedLessonsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAssignedLessonsInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutAssignedLessonsNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutAssignedLessonsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutAssignedLessonsNestedInput>;
export const userUpdateOneRequiredWithoutAssignedLessonsNestedInputObjectZodSchema = makeSchema();
