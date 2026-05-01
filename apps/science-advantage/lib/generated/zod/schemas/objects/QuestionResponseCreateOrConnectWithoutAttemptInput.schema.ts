import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseCreateWithoutAttemptInputObjectSchema as QuestionResponseCreateWithoutAttemptInputObjectSchema } from './QuestionResponseCreateWithoutAttemptInput.schema';
import { QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema as QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedCreateWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => QuestionResponseCreateWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema)])
}).strict();
export const QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema: z.ZodType<Prisma.QuestionResponseCreateOrConnectWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseCreateOrConnectWithoutAttemptInput>;
export const QuestionResponseCreateOrConnectWithoutAttemptInputObjectZodSchema = makeSchema();
