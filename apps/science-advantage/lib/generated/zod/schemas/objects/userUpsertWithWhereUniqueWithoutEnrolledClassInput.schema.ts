import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateWithoutEnrolledClassInputObjectSchema as userUpdateWithoutEnrolledClassInputObjectSchema } from './userUpdateWithoutEnrolledClassInput.schema';
import { userUncheckedUpdateWithoutEnrolledClassInputObjectSchema as userUncheckedUpdateWithoutEnrolledClassInputObjectSchema } from './userUncheckedUpdateWithoutEnrolledClassInput.schema';
import { userCreateWithoutEnrolledClassInputObjectSchema as userCreateWithoutEnrolledClassInputObjectSchema } from './userCreateWithoutEnrolledClassInput.schema';
import { userUncheckedCreateWithoutEnrolledClassInputObjectSchema as userUncheckedCreateWithoutEnrolledClassInputObjectSchema } from './userUncheckedCreateWithoutEnrolledClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => userUpdateWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutEnrolledClassInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutEnrolledClassInputObjectSchema)])
}).strict();
export const userUpsertWithWhereUniqueWithoutEnrolledClassInputObjectSchema: z.ZodType<Prisma.userUpsertWithWhereUniqueWithoutEnrolledClassInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithWhereUniqueWithoutEnrolledClassInput>;
export const userUpsertWithWhereUniqueWithoutEnrolledClassInputObjectZodSchema = makeSchema();
