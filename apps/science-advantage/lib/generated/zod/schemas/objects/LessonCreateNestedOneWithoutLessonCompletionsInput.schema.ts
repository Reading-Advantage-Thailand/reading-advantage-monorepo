import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutLessonCompletionsInputObjectSchema as LessonCreateWithoutLessonCompletionsInputObjectSchema } from './LessonCreateWithoutLessonCompletionsInput.schema';
import { LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema as LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema } from './LessonUncheckedCreateWithoutLessonCompletionsInput.schema';
import { LessonCreateOrConnectWithoutLessonCompletionsInputObjectSchema as LessonCreateOrConnectWithoutLessonCompletionsInputObjectSchema } from './LessonCreateOrConnectWithoutLessonCompletionsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => LessonCreateOrConnectWithoutLessonCompletionsInputObjectSchema).optional(),
  connect: z.lazy(() => LessonWhereUniqueInputObjectSchema).optional()
}).strict();
export const LessonCreateNestedOneWithoutLessonCompletionsInputObjectSchema: z.ZodType<Prisma.LessonCreateNestedOneWithoutLessonCompletionsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateNestedOneWithoutLessonCompletionsInput>;
export const LessonCreateNestedOneWithoutLessonCompletionsInputObjectZodSchema = makeSchema();
