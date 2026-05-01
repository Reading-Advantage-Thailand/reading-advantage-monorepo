import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionCreateWithoutStudentInputObjectSchema as LessonCompletionCreateWithoutStudentInputObjectSchema } from './LessonCompletionCreateWithoutStudentInput.schema';
import { LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema as LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema } from './LessonCompletionUncheckedCreateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => LessonCompletionCreateWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema)])
}).strict();
export const LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema: z.ZodType<Prisma.LessonCompletionCreateOrConnectWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionCreateOrConnectWithoutStudentInput>;
export const LessonCompletionCreateOrConnectWithoutStudentInputObjectZodSchema = makeSchema();
