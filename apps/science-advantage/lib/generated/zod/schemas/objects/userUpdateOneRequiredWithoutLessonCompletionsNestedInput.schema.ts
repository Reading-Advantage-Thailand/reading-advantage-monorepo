import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutLessonCompletionsInputObjectSchema as userCreateWithoutLessonCompletionsInputObjectSchema } from './userCreateWithoutLessonCompletionsInput.schema';
import { userUncheckedCreateWithoutLessonCompletionsInputObjectSchema as userUncheckedCreateWithoutLessonCompletionsInputObjectSchema } from './userUncheckedCreateWithoutLessonCompletionsInput.schema';
import { userCreateOrConnectWithoutLessonCompletionsInputObjectSchema as userCreateOrConnectWithoutLessonCompletionsInputObjectSchema } from './userCreateOrConnectWithoutLessonCompletionsInput.schema';
import { userUpsertWithoutLessonCompletionsInputObjectSchema as userUpsertWithoutLessonCompletionsInputObjectSchema } from './userUpsertWithoutLessonCompletionsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutLessonCompletionsInputObjectSchema as userUpdateToOneWithWhereWithoutLessonCompletionsInputObjectSchema } from './userUpdateToOneWithWhereWithoutLessonCompletionsInput.schema';
import { userUpdateWithoutLessonCompletionsInputObjectSchema as userUpdateWithoutLessonCompletionsInputObjectSchema } from './userUpdateWithoutLessonCompletionsInput.schema';
import { userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema as userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema } from './userUncheckedUpdateWithoutLessonCompletionsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutLessonCompletionsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutLessonCompletionsInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutLessonCompletionsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutLessonCompletionsInputObjectSchema), z.lazy(() => userUpdateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutLessonCompletionsInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutLessonCompletionsNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutLessonCompletionsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutLessonCompletionsNestedInput>;
export const userUpdateOneRequiredWithoutLessonCompletionsNestedInputObjectZodSchema = makeSchema();
