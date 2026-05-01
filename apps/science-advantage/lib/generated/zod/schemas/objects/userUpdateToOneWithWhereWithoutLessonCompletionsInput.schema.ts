import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutLessonCompletionsInputObjectSchema as userUpdateWithoutLessonCompletionsInputObjectSchema } from './userUpdateWithoutLessonCompletionsInput.schema';
import { userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema as userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema } from './userUncheckedUpdateWithoutLessonCompletionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutLessonCompletionsInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutLessonCompletionsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutLessonCompletionsInput>;
export const userUpdateToOneWithWhereWithoutLessonCompletionsInputObjectZodSchema = makeSchema();
