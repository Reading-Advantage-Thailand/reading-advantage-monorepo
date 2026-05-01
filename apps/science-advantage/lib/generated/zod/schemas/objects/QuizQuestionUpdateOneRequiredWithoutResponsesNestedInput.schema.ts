import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionCreateWithoutResponsesInputObjectSchema as QuizQuestionCreateWithoutResponsesInputObjectSchema } from './QuizQuestionCreateWithoutResponsesInput.schema';
import { QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema as QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutResponsesInput.schema';
import { QuizQuestionCreateOrConnectWithoutResponsesInputObjectSchema as QuizQuestionCreateOrConnectWithoutResponsesInputObjectSchema } from './QuizQuestionCreateOrConnectWithoutResponsesInput.schema';
import { QuizQuestionUpsertWithoutResponsesInputObjectSchema as QuizQuestionUpsertWithoutResponsesInputObjectSchema } from './QuizQuestionUpsertWithoutResponsesInput.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionUpdateToOneWithWhereWithoutResponsesInputObjectSchema as QuizQuestionUpdateToOneWithWhereWithoutResponsesInputObjectSchema } from './QuizQuestionUpdateToOneWithWhereWithoutResponsesInput.schema';
import { QuizQuestionUpdateWithoutResponsesInputObjectSchema as QuizQuestionUpdateWithoutResponsesInputObjectSchema } from './QuizQuestionUpdateWithoutResponsesInput.schema';
import { QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema as QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema } from './QuizQuestionUncheckedUpdateWithoutResponsesInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutResponsesInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutResponsesInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => QuizQuestionCreateOrConnectWithoutResponsesInputObjectSchema).optional(),
  upsert: z.lazy(() => QuizQuestionUpsertWithoutResponsesInputObjectSchema).optional(),
  connect: z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => QuizQuestionUpdateToOneWithWhereWithoutResponsesInputObjectSchema), z.lazy(() => QuizQuestionUpdateWithoutResponsesInputObjectSchema), z.lazy(() => QuizQuestionUncheckedUpdateWithoutResponsesInputObjectSchema)]).optional()
}).strict();
export const QuizQuestionUpdateOneRequiredWithoutResponsesNestedInputObjectSchema: z.ZodType<Prisma.QuizQuestionUpdateOneRequiredWithoutResponsesNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUpdateOneRequiredWithoutResponsesNestedInput>;
export const QuizQuestionUpdateOneRequiredWithoutResponsesNestedInputObjectZodSchema = makeSchema();
