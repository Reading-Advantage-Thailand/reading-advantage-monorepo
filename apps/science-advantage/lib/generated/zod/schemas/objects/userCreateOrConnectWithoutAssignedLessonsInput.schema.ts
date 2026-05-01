import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutAssignedLessonsInputObjectSchema as userCreateWithoutAssignedLessonsInputObjectSchema } from './userCreateWithoutAssignedLessonsInput.schema';
import { userUncheckedCreateWithoutAssignedLessonsInputObjectSchema as userUncheckedCreateWithoutAssignedLessonsInputObjectSchema } from './userUncheckedCreateWithoutAssignedLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutAssignedLessonsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAssignedLessonsInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutAssignedLessonsInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutAssignedLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutAssignedLessonsInput>;
export const userCreateOrConnectWithoutAssignedLessonsInputObjectZodSchema = makeSchema();
