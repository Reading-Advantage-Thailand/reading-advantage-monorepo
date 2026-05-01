import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutEnrolledClassInputObjectSchema as userCreateWithoutEnrolledClassInputObjectSchema } from './userCreateWithoutEnrolledClassInput.schema';
import { userUncheckedCreateWithoutEnrolledClassInputObjectSchema as userUncheckedCreateWithoutEnrolledClassInputObjectSchema } from './userUncheckedCreateWithoutEnrolledClassInput.schema';
import { userCreateOrConnectWithoutEnrolledClassInputObjectSchema as userCreateOrConnectWithoutEnrolledClassInputObjectSchema } from './userCreateOrConnectWithoutEnrolledClassInput.schema';
import { userUpsertWithWhereUniqueWithoutEnrolledClassInputObjectSchema as userUpsertWithWhereUniqueWithoutEnrolledClassInputObjectSchema } from './userUpsertWithWhereUniqueWithoutEnrolledClassInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateWithWhereUniqueWithoutEnrolledClassInputObjectSchema as userUpdateWithWhereUniqueWithoutEnrolledClassInputObjectSchema } from './userUpdateWithWhereUniqueWithoutEnrolledClassInput.schema';
import { userUpdateManyWithWhereWithoutEnrolledClassInputObjectSchema as userUpdateManyWithWhereWithoutEnrolledClassInputObjectSchema } from './userUpdateManyWithWhereWithoutEnrolledClassInput.schema';
import { userScalarWhereInputObjectSchema as userScalarWhereInputObjectSchema } from './userScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutEnrolledClassInputObjectSchema), z.lazy(() => userCreateWithoutEnrolledClassInputObjectSchema).array(), z.lazy(() => userUncheckedCreateWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutEnrolledClassInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => userCreateOrConnectWithoutEnrolledClassInputObjectSchema), z.lazy(() => userCreateOrConnectWithoutEnrolledClassInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => userUpsertWithWhereUniqueWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUpsertWithWhereUniqueWithoutEnrolledClassInputObjectSchema).array()]).optional(),
  set: z.union([z.lazy(() => userWhereUniqueInputObjectSchema), z.lazy(() => userWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => userWhereUniqueInputObjectSchema), z.lazy(() => userWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => userWhereUniqueInputObjectSchema), z.lazy(() => userWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => userWhereUniqueInputObjectSchema), z.lazy(() => userWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => userUpdateWithWhereUniqueWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUpdateWithWhereUniqueWithoutEnrolledClassInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => userUpdateManyWithWhereWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUpdateManyWithWhereWithoutEnrolledClassInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => userScalarWhereInputObjectSchema), z.lazy(() => userScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const userUncheckedUpdateManyWithoutEnrolledClassNestedInputObjectSchema: z.ZodType<Prisma.userUncheckedUpdateManyWithoutEnrolledClassNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUncheckedUpdateManyWithoutEnrolledClassNestedInput>;
export const userUncheckedUpdateManyWithoutEnrolledClassNestedInputObjectZodSchema = makeSchema();
