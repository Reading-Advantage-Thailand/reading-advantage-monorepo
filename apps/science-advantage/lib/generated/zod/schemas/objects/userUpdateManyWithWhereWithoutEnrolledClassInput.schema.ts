import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userScalarWhereInputObjectSchema as userScalarWhereInputObjectSchema } from './userScalarWhereInput.schema';
import { userUpdateManyMutationInputObjectSchema as userUpdateManyMutationInputObjectSchema } from './userUpdateManyMutationInput.schema';
import { userUncheckedUpdateManyWithoutEnrolledClassInputObjectSchema as userUncheckedUpdateManyWithoutEnrolledClassInputObjectSchema } from './userUncheckedUpdateManyWithoutEnrolledClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => userUpdateManyMutationInputObjectSchema), z.lazy(() => userUncheckedUpdateManyWithoutEnrolledClassInputObjectSchema)])
}).strict();
export const userUpdateManyWithWhereWithoutEnrolledClassInputObjectSchema: z.ZodType<Prisma.userUpdateManyWithWhereWithoutEnrolledClassInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateManyWithWhereWithoutEnrolledClassInput>;
export const userUpdateManyWithWhereWithoutEnrolledClassInputObjectZodSchema = makeSchema();
