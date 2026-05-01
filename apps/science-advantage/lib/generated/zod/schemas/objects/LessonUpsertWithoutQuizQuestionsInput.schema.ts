import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonUpdateWithoutQuizQuestionsInputObjectSchema as LessonUpdateWithoutQuizQuestionsInputObjectSchema } from './LessonUpdateWithoutQuizQuestionsInput.schema';
import { LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema as LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema } from './LessonUncheckedUpdateWithoutQuizQuestionsInput.schema';
import { LessonCreateWithoutQuizQuestionsInputObjectSchema as LessonCreateWithoutQuizQuestionsInputObjectSchema } from './LessonCreateWithoutQuizQuestionsInput.schema';
import { LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema as LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema } from './LessonUncheckedCreateWithoutQuizQuestionsInput.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => LessonUpdateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutQuizQuestionsInputObjectSchema)]),
  create: z.union([z.lazy(() => LessonCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutQuizQuestionsInputObjectSchema)]),
  where: z.lazy(() => LessonWhereInputObjectSchema).optional()
}).strict();
export const LessonUpsertWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.LessonUpsertWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpsertWithoutQuizQuestionsInput>;
export const LessonUpsertWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
