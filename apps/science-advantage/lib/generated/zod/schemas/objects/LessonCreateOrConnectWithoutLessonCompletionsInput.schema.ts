import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonCreateWithoutLessonCompletionsInputObjectSchema as LessonCreateWithoutLessonCompletionsInputObjectSchema } from './LessonCreateWithoutLessonCompletionsInput.schema';
import { LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema as LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema } from './LessonUncheckedCreateWithoutLessonCompletionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => LessonCreateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema)])
}).strict();
export const LessonCreateOrConnectWithoutLessonCompletionsInputObjectSchema: z.ZodType<Prisma.LessonCreateOrConnectWithoutLessonCompletionsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateOrConnectWithoutLessonCompletionsInput>;
export const LessonCreateOrConnectWithoutLessonCompletionsInputObjectZodSchema = makeSchema();
