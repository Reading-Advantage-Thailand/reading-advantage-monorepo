import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionCreateWithoutResponsesInputObjectSchema as QuizQuestionCreateWithoutResponsesInputObjectSchema } from './QuizQuestionCreateWithoutResponsesInput.schema';
import { QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema as QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutResponsesInput.schema';
import { QuizQuestionCreateOrConnectWithoutResponsesInputObjectSchema as QuizQuestionCreateOrConnectWithoutResponsesInputObjectSchema } from './QuizQuestionCreateOrConnectWithoutResponsesInput.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutResponsesInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => QuizQuestionCreateOrConnectWithoutResponsesInputObjectSchema).optional(),
  connect: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).optional()
}).strict();
export const QuizQuestionCreateNestedOneWithoutResponsesInputObjectSchema: z.ZodType<Prisma.QuizQuestionCreateNestedOneWithoutResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCreateNestedOneWithoutResponsesInput>;
export const QuizQuestionCreateNestedOneWithoutResponsesInputObjectZodSchema = makeSchema();
