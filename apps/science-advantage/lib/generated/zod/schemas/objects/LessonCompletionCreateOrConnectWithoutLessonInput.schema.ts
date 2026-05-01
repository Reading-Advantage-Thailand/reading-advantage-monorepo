import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionCreateWithoutLessonInputObjectSchema as LessonCompletionCreateWithoutLessonInputObjectSchema } from './LessonCompletionCreateWithoutLessonInput.schema';
import { LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema as LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema } from './LessonCompletionUncheckedCreateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => LessonCompletionCreateWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema)])
}).strict();
export const LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema: z.ZodType<Prisma.LessonCompletionCreateOrConnectWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionCreateOrConnectWithoutLessonInput>;
export const LessonCompletionCreateOrConnectWithoutLessonInputObjectZodSchema = makeSchema();
