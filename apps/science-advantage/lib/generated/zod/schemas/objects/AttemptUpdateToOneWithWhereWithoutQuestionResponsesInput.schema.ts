import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereInputObjectSchema as AttemptWhereInputObjectSchema } from './AttemptWhereInput.schema';
import { AttemptUpdateWithoutQuestionResponsesInputObjectSchema as AttemptUpdateWithoutQuestionResponsesInputObjectSchema } from './AttemptUpdateWithoutQuestionResponsesInput.schema';
import { AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema as AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema } from './AttemptUncheckedUpdateWithoutQuestionResponsesInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => AttemptUpdateWithoutQuestionResponsesInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutQuestionResponsesInputObjectSchema)])
}).strict();
export const AttemptUpdateToOneWithWhereWithoutQuestionResponsesInputObjectSchema: z.ZodType<Prisma.AttemptUpdateToOneWithWhereWithoutQuestionResponsesInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateToOneWithWhereWithoutQuestionResponsesInput>;
export const AttemptUpdateToOneWithWhereWithoutQuestionResponsesInputObjectZodSchema = makeSchema();
