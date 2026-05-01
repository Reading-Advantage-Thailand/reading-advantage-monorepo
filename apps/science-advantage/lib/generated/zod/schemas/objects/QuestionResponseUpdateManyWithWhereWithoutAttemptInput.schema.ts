import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseScalarWhereInputObjectSchema as QuestionResponseScalarWhereInputObjectSchema } from './QuestionResponseScalarWhereInput.schema';
import { QuestionResponseUpdateManyMutationInputObjectSchema as QuestionResponseUpdateManyMutationInputObjectSchema } from './QuestionResponseUpdateManyMutationInput.schema';
import { QuestionResponseUncheckedUpdateManyWithoutAttemptInputObjectSchema as QuestionResponseUncheckedUpdateManyWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedUpdateManyWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuestionResponseScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => QuestionResponseUpdateManyMutationInputObjectSchema), z.lazy(() => QuestionResponseUncheckedUpdateManyWithoutAttemptInputObjectSchema)])
}).strict();
export const QuestionResponseUpdateManyWithWhereWithoutAttemptInputObjectSchema: z.ZodType<Prisma.QuestionResponseUpdateManyWithWhereWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUpdateManyWithWhereWithoutAttemptInput>;
export const QuestionResponseUpdateManyWithWhereWithoutAttemptInputObjectZodSchema = makeSchema();
