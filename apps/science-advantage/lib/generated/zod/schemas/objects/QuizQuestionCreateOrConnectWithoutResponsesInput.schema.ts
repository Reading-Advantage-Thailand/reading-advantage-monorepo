import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionCreateWithoutResponsesInputObjectSchema as QuizQuestionCreateWithoutResponsesInputObjectSchema } from './QuizQuestionCreateWithoutResponsesInput.schema';
import { QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema as QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutResponsesInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutResponsesInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema)])
}).strict();
export const QuizQuestionCreateOrConnectWithoutResponsesInputObjectSchema: z.ZodType<Prisma.QuizQuestionCreateOrConnectWithoutResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCreateOrConnectWithoutResponsesInput>;
export const QuizQuestionCreateOrConnectWithoutResponsesInputObjectZodSchema = makeSchema();
