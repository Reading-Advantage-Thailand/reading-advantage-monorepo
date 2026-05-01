import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionScalarWhereInputObjectSchema as LessonCompletionScalarWhereInputObjectSchema } from './LessonCompletionScalarWhereInput.schema';
import { LessonCompletionUpdateManyMutationInputObjectSchema as LessonCompletionUpdateManyMutationInputObjectSchema } from './LessonCompletionUpdateManyMutationInput.schema';
import { LessonCompletionUncheckedUpdateManyWithoutLessonInputObjectSchema as LessonCompletionUncheckedUpdateManyWithoutLessonInputObjectSchema } from './LessonCompletionUncheckedUpdateManyWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonCompletionScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => LessonCompletionUpdateManyMutationInputObjectSchema), z.lazy(() => LessonCompletionUncheckedUpdateManyWithoutLessonInputObjectSchema)])
}).strict();
export const LessonCompletionUpdateManyWithWhereWithoutLessonInputObjectSchema: z.ZodType<Prisma.LessonCompletionUpdateManyWithWhereWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUpdateManyWithWhereWithoutLessonInput>;
export const LessonCompletionUpdateManyWithWhereWithoutLessonInputObjectZodSchema = makeSchema();
