import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptUpdateWithoutQuestionResponsesInputObjectSchema as AttemptUpdateWithoutQuestionResponsesInputObjectSchema } from './AttemptUpdateWithoutQuestionResponsesInput.schema';
import { AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema as AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema } from './AttemptUncheckedUpdateWithoutQuestionResponsesInput.schema';
import { AttemptCreateWithoutQuestionResponsesInputObjectSchema as AttemptCreateWithoutQuestionResponsesInputObjectSchema } from './AttemptCreateWithoutQuestionResponsesInput.schema';
import { AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema as AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema } from './AttemptUncheckedCreateWithoutQuestionResponsesInput.schema';
import { AttemptWhereInputObjectSchema as AttemptWhereInputObjectSchema } from './AttemptWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => AttemptUpdateWithoutQuestionResponsesInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema)]),
  create: z.union([z.lazy(() => AttemptCreateWithoutQuestionResponsesInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema)]),
  where: z.lazy(() => AttemptWhereInputObjectSchema).optional()
}).strict();
export const AttemptUpsertWithoutQuestionResponsesInputObjectSchema: z.ZodType<Prisma.AttemptUpsertWithoutQuestionResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpsertWithoutQuestionResponsesInput>;
export const AttemptUpsertWithoutQuestionResponsesInputObjectZodSchema = makeSchema();
