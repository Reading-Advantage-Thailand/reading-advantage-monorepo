import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptCreateWithoutQuestionResponsesInputObjectSchema as AttemptCreateWithoutQuestionResponsesInputObjectSchema } from './AttemptCreateWithoutQuestionResponsesInput.schema';
import { AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema as AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema } from './AttemptUncheckedCreateWithoutQuestionResponsesInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => AttemptCreateWithoutQuestionResponsesInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema)])
}).strict();
export const AttemptCreateOrConnectWithoutQuestionResponsesInputObjectSchema: z.ZodType<Prisma.AttemptCreateOrConnectWithoutQuestionResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateOrConnectWithoutQuestionResponsesInput>;
export const AttemptCreateOrConnectWithoutQuestionResponsesInputObjectZodSchema = makeSchema();
