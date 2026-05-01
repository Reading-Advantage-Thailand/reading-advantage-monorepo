import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereInputObjectSchema as QuizQuestionWhereInputObjectSchema } from './QuizQuestionWhereInput.schema';
import { QuizQuestionUpdateWithoutResponsesInputObjectSchema as QuizQuestionUpdateWithoutResponsesInputObjectSchema } from './QuizQuestionUpdateWithoutResponsesInput.schema';
import { QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema as QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema } from './QuizQuestionUncheckedUpdateWithoutResponsesInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => QuizQuestionUpdateWithoutResponsesInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema)])
}).strict();
export const QuizQuestionUpdateToOneWithWhereWithoutResponsesInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpdateToOneWithWhereWithoutResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpdateToOneWithWhereWithoutResponsesInput>;
export const QuizQuestionUpdateToOneWithWhereWithoutResponsesInputObjectZodSchema = makeSchema();
