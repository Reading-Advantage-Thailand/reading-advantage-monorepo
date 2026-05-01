import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateWithoutQuestionResponsesInputObjectSchema as AttemptCreateWithoutQuestionResponsesInputObjectSchema } from './AttemptCreateWithoutQuestionResponsesInput.schema';
import { AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema as AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema } from './AttemptUncheckedCreateWithoutQuestionResponsesInput.schema';
import { AttemptCreateOrConnectWithoutQuestionResponsesInputObjectSchema as AttemptCreateOrConnectWithoutQuestionResponsesInputObjectSchema } from './AttemptCreateOrConnectWithoutQuestionResponsesInput.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AttemptCreateWithoutQuestionResponsesInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => AttemptCreateOrConnectWithoutQuestionResponsesInputObjectSchema).optional(),
  connect: z.lazy(() => AttemptWhereUniqueInputObjectSchema).optional()
}).strict();
export const AttemptCreateNestedOneWithoutQuestionResponsesInputObjectSchema: z.ZodType<Prisma.AttemptCreateNestedOneWithoutQuestionResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateNestedOneWithoutQuestionResponsesInput>;
export const AttemptCreateNestedOneWithoutQuestionResponsesInputObjectZodSchema = makeSchema();
