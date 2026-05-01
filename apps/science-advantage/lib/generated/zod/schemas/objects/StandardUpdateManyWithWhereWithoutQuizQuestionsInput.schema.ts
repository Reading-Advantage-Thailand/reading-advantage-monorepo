import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardScalarWhereInputObjectSchema as StandardScalarWhereInputObjectSchema } from './StandardScalarWhereInput.schema';
import { StandardUpdateManyMutationInputObjectSchema as StandardUpdateManyMutationInputObjectSchema } from './StandardUpdateManyMutationInput.schema';
import { StandardUncheckedUpdateManyWithoutQuizQuestionsInputObjectSchema as StandardUncheckedUpdateManyWithoutQuizQuestionsInputObjectSchema } from './StandardUncheckedUpdateManyWithoutQuizQuestionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => StandardUpdateManyMutationInputObjectSchema), z.lazy(() => StandardUncheckedUpdateManyWithoutQuizQuestionsInputObjectSchema)])
}).strict();
export const StandardUpdateManyWithWhereWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.StandardUpdateManyWithWhereWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateManyWithWhereWithoutQuizQuestionsInput>;
export const StandardUpdateManyWithWhereWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
