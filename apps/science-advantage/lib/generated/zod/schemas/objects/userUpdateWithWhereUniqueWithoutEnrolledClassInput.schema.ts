import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateWithoutEnrolledClassInputObjectSchema as userUpdateWithoutEnrolledClassInputObjectSchema } from './userUpdateWithoutEnrolledClassInput.schema';
import { userUncheckedUpdateWithoutEnrolledClassInputObjectSchema as userUncheckedUpdateWithoutEnrolledClassInputObjectSchema } from './userUncheckedUpdateWithoutEnrolledClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => userUpdateWithoutEnrolledClassInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutEnrolledClassInputObjectSchema)])
}).strict();
export const userUpdateWithWhereUniqueWithoutEnrolledClassInputObjectSchema: z.ZodType<Prisma.userUpdateWithWhereUniqueWithoutEnrolledClassInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateWithWhereUniqueWithoutEnrolledClassInput>;
export const userUpdateWithWhereUniqueWithoutEnrolledClassInputObjectZodSchema = makeSchema();
