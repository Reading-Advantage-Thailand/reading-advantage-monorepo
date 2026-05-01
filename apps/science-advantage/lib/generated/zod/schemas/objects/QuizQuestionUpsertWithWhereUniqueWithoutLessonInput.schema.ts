import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionUpdateWithoutLessonInputObjectSchema as QuizQuestionUpdateWithoutLessonInputObjectSchema } from './QuizQuestionUpdateWithoutLessonInput.schema';
import { QuizQuestionUncheckedUpdateWithoutLessonInputObjectSchema as QuizQuestionUncheckedUpdateWithoutLessonInputObjectSchema } from './QuizQuestionUncheckedUpdateWithoutLessonInput.schema';
import { QuizQuestionCreateWithoutLessonInputObjectSchema as QuizQuestionCreateWithoutLessonInputObjectSchema } from './QuizQuestionCreateWithoutLessonInput.schema';
import { QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema as QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => QuizQuestionUpdateWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateWithoutLessonInputObjectSchema)]),
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema)])
}).strict();
export const QuizQuestionUpsertWithWhereUniqueWithoutLessonInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpsertWithWhereUniqueWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpsertWithWhereUniqueWithoutLessonInput>;
export const QuizQuestionUpsertWithWhereUniqueWithoutLessonInputObjectZodSchema = makeSchema();
