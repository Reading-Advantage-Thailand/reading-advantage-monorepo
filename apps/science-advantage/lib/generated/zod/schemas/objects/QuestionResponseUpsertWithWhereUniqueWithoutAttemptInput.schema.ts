import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseUpdateWithoutAttemptInputObjectSchema as QuestionResponseUpdateWithoutAttemptInputObjectSchema } from './QuestionResponseUpdateWithoutAttemptInput.schema';
import { QuestionResponseUncheckedUpdateWithoutAttemptInputObjectSchema as QuestionResponseUncheckedUpdateWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedUpdateWithoutAttemptInput.schema';
import { QuestionResponseCreateWithoutAttemptInputObjectSchema as QuestionResponseCreateWithoutAttemptInputObjectSchema } from './QuestionResponseCreateWithoutAttemptInput.schema';
import { QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema as QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedCreateWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => QuestionResponseUpdateWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUncheckedUpdateWithoutAttemptInputObjectSchema)]),
  create: z.union([z.lazy(() => QuestionResponseCreateWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema)])
}).strict();
export const QuestionResponseUpsertWithWhereUniqueWithoutAttemptInputObjectSchema: z.ZodType<Prisma.QuestionResponseUpsertWithWhereUniqueWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUpsertWithWhereUniqueWithoutAttemptInput>;
export const QuestionResponseUpsertWithWhereUniqueWithoutAttemptInputObjectZodSchema = makeSchema();
