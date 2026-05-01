import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema';
import { LessonCreateWithoutAttemptsInputObjectSchema as LessonCreateWithoutAttemptsInputObjectSchema } from './LessonCreateWithoutAttemptsInput.schema';
import { LessonUncheckedCreateWithoutAttemptsInputObjectSchema as LessonUncheckedCreateWithoutAttemptsInputObjectSchema } from './LessonUncheckedCreateWithoutAttemptsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => LessonWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => LessonCreateWithoutAttemptsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutAttemptsInputObjectSchema)])
}).strict();
export const LessonCreateOrConnectWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.LessonCreateOrConnectWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateOrConnectWithoutAttemptsInput>;
export const LessonCreateOrConnectWithoutAttemptsInputObjectZodSchema = makeSchema();
