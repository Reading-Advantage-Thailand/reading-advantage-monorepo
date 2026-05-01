import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateWithoutQuestionResponsesInputObjectSchema as AttemptCreateWithoutQuestionResponsesInputObjectSchema } from './AttemptCreateWithoutQuestionResponsesInput.schema';
import { AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema as AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema } from './AttemptUncheckedCreateWithoutQuestionResponsesInput.schema';
import { AttemptCreateOrConnectWithoutQuestionResponsesInputObjectSchema as AttemptCreateOrConnectWithoutQuestionResponsesInputObjectSchema } from './AttemptCreateOrConnectWithoutQuestionResponsesInput.schema';
import { AttemptUpsertWithoutQuestionResponsesInputObjectSchema as AttemptUpsertWithoutQuestionResponsesInputObjectSchema } from './AttemptUpsertWithoutQuestionResponsesInput.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptUpdateToOneWithWhereWithoutQuestionResponsesInputObjectSchema as AttemptUpdateToOneWithWhereWithoutQuestionResponsesInputObjectSchema } from './AttemptUpdateToOneWithWhereWithoutQuestionResponsesInput.schema';
import { AttemptUpdateWithoutQuestionResponsesInputObjectSchema as AttemptUpdateWithoutQuestionResponsesInputObjectSchema } from './AttemptUpdateWithoutQuestionResponsesInput.schema';
import { AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema as AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema } from './AttemptUncheckedUpdateWithoutQuestionResponsesInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AttemptCreateWithoutQuestionResponsesInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutQuestionResponsesInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => AttemptCreateOrConnectWithoutQuestionResponsesInputObjectSchema).optional(),
  upsert: z.lazy(() => AttemptUpsertWithoutQuestionResponsesInputObjectSchema).optional(),
  connect: z.lazy(() => AttemptWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => AttemptUpdateToOneWithWhereWithoutQuestionResponsesInputObjectSchema), z.lazy(() => AttemptUpdateWithoutQuestionResponsesInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema)]).optional()
}).strict();
export const AttemptUpdateOneRequiredWithoutQuestionResponsesNestedInputObjectSchema: z.ZodType<Prisma.AttemptUpdateOneRequiredWithoutQuestionResponsesNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateOneRequiredWithoutQuestionResponsesNestedInput>;
export const AttemptUpdateOneRequiredWithoutQuestionResponsesNestedInputObjectZodSchema = makeSchema();
