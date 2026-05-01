import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema';
import { LessonUpdateWithoutAttemptsInputObjectSchema as LessonUpdateWithoutAttemptsInputObjectSchema } from './LessonUpdateWithoutAttemptsInput.schema';
import { LessonUncheckedUpdateWithoutAttemptsInputObjectSchema as LessonUncheckedUpdateWithoutAttemptsInputObjectSchema } from './LessonUncheckedUpdateWithoutAttemptsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => LessonUpdateWithoutAttemptsInputObjectSchema), z.lazy(() => LessonUncheckedUpdateWithoutAttemptsInputObjectSchema)])
}).strict();
export const LessonUpdateToOneWithWhereWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.LessonUpdateToOneWithWhereWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUpdateToOneWithWhereWithoutAttemptsInput>;
export const LessonUpdateToOneWithWhereWithoutAttemptsInputObjectZodSchema = makeSchema();
