import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseUpdateWithoutAttemptInputObjectSchema as QuestionResponseUpdateWithoutAttemptInputObjectSchema } from './QuestionResponseUpdateWithoutAttemptInput.schema';
import { QuestionResponseUncheckedUpdateWithoutAttemptInputObjectSchema as QuestionResponseUncheckedUpdateWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedUpdateWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => QuestionResponseUpdateWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUncheckedUpdateWithoutAttemptInputObjectSchema)])
}).strict();
export const QuestionResponseUpdateWithWhereUniqueWithoutAttemptInputObjectSchema: z.ZodType<Prisma.QuestionResponseUpdateWithWhereUniqueWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUpdateWithWhereUniqueWithoutAttemptInput>;
export const QuestionResponseUpdateWithWhereUniqueWithoutAttemptInputObjectZodSchema = makeSchema();
