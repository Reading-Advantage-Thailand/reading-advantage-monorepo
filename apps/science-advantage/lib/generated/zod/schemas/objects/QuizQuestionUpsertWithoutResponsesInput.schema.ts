import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionUpdateWithoutResponsesInputObjectSchema as QuizQuestionUpdateWithoutResponsesInputObjectSchema } from './QuizQuestionUpdateWithoutResponsesInput.schema';
import { QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema as QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema } from './QuizQuestionUncheckedUpdateWithoutResponsesInput.schema';
import { QuizQuestionCreateWithoutResponsesInputObjectSchema as QuizQuestionCreateWithoutResponsesInputObjectSchema } from './QuizQuestionCreateWithoutResponsesInput.schema';
import { QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema as QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutResponsesInput.schema';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './QuizQuestionWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => QuizQuestionUpdateWithoutResponsesInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema)]),
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutResponsesInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema)]),
  where: z.lazy(() => QuizQuestionWhereInputObjectSchema).optional()
}).strict();
export const QuizQuestionUpsertWithoutResponsesInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpsertWithoutResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpsertWithoutResponsesInput>;
export const QuizQuestionUpsertWithoutResponsesInputObjectZodSchema = makeSchema();
