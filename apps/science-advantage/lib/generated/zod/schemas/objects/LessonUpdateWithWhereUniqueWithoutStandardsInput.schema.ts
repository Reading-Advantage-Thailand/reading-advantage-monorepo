import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonUpdateWithoutStandardsInputObjectSchema as LessonUpdateWithoutStandardsInputObjectSchema } from './LessonUpdateWithoutStandardsInput.schema';
import { LessonUncheckedUpdateWithoutStandardsInputObjectSchema as LessonUncheckedUpdateWithoutStandardsInputObjectSchema } from './LessonUncheckedUpdateWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => LessonUpdateWithoutStandardsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutStandardsInputObjectSchema)])
}).strict();
export const LessonUpdateWithWhereUniqueWithoutStandardsInputObjectSchema: z.ZodType<Prisma.LessonUpdateWithWhereUniqueWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateWithWhereUniqueWithoutStandardsInput>;
export const LessonUpdateWithWhereUniqueWithoutStandardsInputObjectZodSchema = makeSchema();
