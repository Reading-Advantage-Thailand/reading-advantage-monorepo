import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutEnrolledClassInputObjectSchema as userCreateWithoutEnrolledClassInputObjectSchema } from './userCreateWithoutEnrolledClassInput.schema';
import { userUncheckedCreateWithoutEnrolledClassInputObjectSchema as userUncheckedCreateWithoutEnrolledClassInputObjectSchema } from './userUncheckedCreateWithoutEnrolledClassInput.schema';
import { userCreateOrConnectWithoutEnrolledClassInputObjectSchema as userCreateOrConnectWithoutEnrolledClassInputObjectSchema } from './userCreateOrConnectWithoutEnrolledClassInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutEnrolledClassInputObjectSchema), z.lazy(() => userCreateWithoutEnrolledClassInputObjectSchema).array(), z.lazy(() => userUncheckedCreateWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutEnrolledClassInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => userCreateOrConnectWithoutEnrolledClassInputObjectSchema), z.lazy(() => userCreateOrConnectWithoutEnrolledClassInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => userWhereUniqueInputObjectSchema), z.lazy(() => userWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectSchema: z.ZodType<Prisma.userUncheckedCreateNestedManyWithoutEnrolledClassInput> = makeSchema() as unknown as z.ZodType<Prisma.userUncheckedCreateNestedManyWithoutEnrolledClassInput>;
export const userUncheckedCreateNestedManyWithoutEnrolledClassInputObjectZodSchema = makeSchema();
