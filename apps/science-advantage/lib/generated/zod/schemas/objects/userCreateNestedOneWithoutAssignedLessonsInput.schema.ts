import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutAssignedLessonsInputObjectSchema as userCreateWithoutAssignedLessonsInputObjectSchema } from './userCreateWithoutAssignedLessonsInput.schema';
import { userUncheckedCreateWithoutAssignedLessonsInputObjectSchema as userUncheckedCreateWithoutAssignedLessonsInputObjectSchema } from './userUncheckedCreateWithoutAssignedLessonsInput.schema';
import { userCreateOrConnectWithoutAssignedLessonsInputObjectSchema as userCreateOrConnectWithoutAssignedLessonsInputObjectSchema } from './userCreateOrConnectWithoutAssignedLessonsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutAssignedLessonsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAssignedLessonsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutAssignedLessonsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutAssignedLessonsInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutAssignedLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutAssignedLessonsInput>;
export const userCreateNestedOneWithoutAssignedLessonsInputObjectZodSchema = makeSchema();
