import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonScalarWhereInputObjectSchema as LessonScalarWhereInputObjectSchema } from './LessonScalarWhereInput.schema';
import { LessonUpdateManyMutationInputObjectSchema as LessonUpdateManyMutationInputObjectSchema } from './LessonUpdateManyMutationInput.schema';
import { LessonUncheckedUpdateManyWithoutStandardsInputObjectSchema as LessonUncheckedUpdateManyWithoutStandardsInputObjectSchema } from './LessonUncheckedUpdateManyWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => LessonUpdateManyMutationInputObjectSchema), z.lazy(() => LessonUncheckedUpdateManyWithoutStandardsInputObjectSchema)])
}).strict();
export const LessonUpdateManyWithWhereWithoutStandardsInputObjectSchema: z.ZodType<Prisma.LessonUpdateManyWithWhereWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateManyWithWhereWithoutStandardsInput>;
export const LessonUpdateManyWithWhereWithoutStandardsInputObjectZodSchema = makeSchema();
