import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionScalarWhereInputObjectSchema as LessonCompletionScalarWhereInputObjectSchema } from './LessonCompletionScalarWhereInput.schema';
import { LessonCompletionUpdateManyMutationInputObjectSchema as LessonCompletionUpdateManyMutationInputObjectSchema } from './LessonCompletionUpdateManyMutationInput.schema';
import { LessonCompletionUncheckedUpdateManyWithoutStudentInputObjectSchema as LessonCompletionUncheckedUpdateManyWithoutStudentInputObjectSchema } from './LessonCompletionUncheckedUpdateManyWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonCompletionScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => LessonCompletionUpdateManyMutationInputObjectSchema), z.lazy(() => LessonCompletionUncheckedUpdateManyWithoutStudentInputObjectSchema)])
}).strict();
export const LessonCompletionUpdateManyWithWhereWithoutStudentInputObjectSchema: z.ZodType<Prisma.LessonCompletionUpdateManyWithWhereWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUpdateManyWithWhereWithoutStudentInput>;
export const LessonCompletionUpdateManyWithWhereWithoutStudentInputObjectZodSchema = makeSchema();
