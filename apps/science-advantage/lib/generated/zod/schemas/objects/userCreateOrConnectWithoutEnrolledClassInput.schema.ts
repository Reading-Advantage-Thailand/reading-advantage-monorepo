import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutEnrolledClassInputObjectSchema as userCreateWithoutEnrolledClassInputObjectSchema } from './userCreateWithoutEnrolledClassInput.schema';
import { userUncheckedCreateWithoutEnrolledClassInputObjectSchema as userUncheckedCreateWithoutEnrolledClassInputObjectSchema } from './userUncheckedCreateWithoutEnrolledClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutEnrolledClassInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutEnrolledClassInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutEnrolledClassInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutEnrolledClassInput>;
export const userCreateOrConnectWithoutEnrolledClassInputObjectZodSchema = makeSchema();
