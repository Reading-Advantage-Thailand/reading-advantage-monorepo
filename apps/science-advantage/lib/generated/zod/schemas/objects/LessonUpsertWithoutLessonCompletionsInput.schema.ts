import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonUpdateWithoutLessonCompletionsInputObjectSchema as LessonUpdateWithoutLessonCompletionsInputObjectSchema } from './LessonUpdateWithoutLessonCompletionsInput.schema';
import { LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema as LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema } from './LessonUncheckedUpdateWithoutLessonCompletionsInput.schema';
import { LessonCreateWithoutLessonCompletionsInputObjectSchema as LessonCreateWithoutLessonCompletionsInputObjectSchema } from './LessonCreateWithoutLessonCompletionsInput.schema';
import { LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema as LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema } from './LessonUncheckedCreateWithoutLessonCompletionsInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => LessonUpdateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutLessonCompletionsInputObjectSchema)]),
  create: z.union([z.lazy(() => LessonCreateWithoutLessonCompletionsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutLessonCompletionsInputObjectSchema)]),
  where: z.lazy(() => LessonWhereInputObjectSchema).optional()
}).strict();
export const LessonUpsertWithoutLessonCompletionsInputObjectSchema: z.ZodType<Prisma.LessonUpsertWithoutLessonCompletionsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpsertWithoutLessonCompletionsInput>;
export const LessonUpsertWithoutLessonCompletionsInputObjectZodSchema = makeSchema();
