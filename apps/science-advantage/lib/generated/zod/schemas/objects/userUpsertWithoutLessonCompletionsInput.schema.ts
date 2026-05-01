import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutLessonCompletionsInputObjectSchema as userUpdateWithoutLessonCompletionsInputObjectSchema } from './userUpdateWithoutLessonCompletionsInput.schema';
import { userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema as userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema } from './userUncheckedUpdateWithoutLessonCompletionsInput.schema';
import { userCreateWithoutLessonCompletionsInputObjectSchema as userCreateWithoutLessonCompletionsInputObjectSchema } from './userCreateWithoutLessonCompletionsInput.schema';
import { userUncheckedCreateWithoutLessonCompletionsInputObjectSchema as userUncheckedCreateWithoutLessonCompletionsInputObjectSchema } from './userUncheckedCreateWithoutLessonCompletionsInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutLessonCompletionsInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutLessonCompletionsInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutLessonCompletionsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutLessonCompletionsInput>;
export const userUpsertWithoutLessonCompletionsInputObjectZodSchema = makeSchema();
