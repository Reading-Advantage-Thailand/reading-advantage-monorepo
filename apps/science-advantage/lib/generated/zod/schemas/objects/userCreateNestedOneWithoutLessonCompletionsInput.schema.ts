import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutLessonCompletionsInputObjectSchema as userCreateWithoutLessonCompletionsInputObjectSchema } from './userCreateWithoutLessonCompletionsInput.schema';
import { userUncheckedCreateWithoutLessonCompletionsInputObjectSchema as userUncheckedCreateWithoutLessonCompletionsInputObjectSchema } from './userUncheckedCreateWithoutLessonCompletionsInput.schema';
import { userCreateOrConnectWithoutLessonCompletionsInputObjectSchema as userCreateOrConnectWithoutLessonCompletionsInputObjectSchema } from './userCreateOrConnectWithoutLessonCompletionsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutLessonCompletionsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutLessonCompletionsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutLessonCompletionsInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutLessonCompletionsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutLessonCompletionsInput>;
export const userCreateNestedOneWithoutLessonCompletionsInputObjectZodSchema = makeSchema();
