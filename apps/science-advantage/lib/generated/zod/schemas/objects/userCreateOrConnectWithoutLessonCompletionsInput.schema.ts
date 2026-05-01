import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutLessonCompletionsInputObjectSchema as userCreateWithoutLessonCompletionsInputObjectSchema } from './userCreateWithoutLessonCompletionsInput.schema';
import { userUncheckedCreateWithoutLessonCompletionsInputObjectSchema as userUncheckedCreateWithoutLessonCompletionsInputObjectSchema } from './userUncheckedCreateWithoutLessonCompletionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutLessonCompletionsInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutLessonCompletionsInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutLessonCompletionsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutLessonCompletionsInput>;
export const userCreateOrConnectWithoutLessonCompletionsInputObjectZodSchema = makeSchema();
