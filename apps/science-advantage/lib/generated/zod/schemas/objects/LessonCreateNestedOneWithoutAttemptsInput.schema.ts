import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateWithoutAttemptsInputObjectSchema as LessonCreateWithoutAttemptsInputObjectSchema } from './LessonCreateWithoutAttemptsInput.schema';
import { LessonUncheckedCreateWithoutAttemptsInputObjectSchema as LessonUncheckedCreateWithoutAttemptsInputObjectSchema } from './LessonUncheckedCreateWithoutAttemptsInput.schema';
import { LessonCreateOrConnectWithoutAttemptsInputObjectSchema as LessonCreateOrConnectWithoutAttemptsInputObjectSchema } from './LessonCreateOrConnectWithoutAttemptsInput.schema';
import { LessonWhereUniqueInputObjectSchema as LessonWhereUniqueInputObjectSchema } from './LessonWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCreateWithoutAttemptsInputObjectSchema), z.lazy(() => LessonUncheckedCreateWithoutAttemptsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => LessonCreateOrConnectWithoutAttemptsInputObjectSchema).optional(),
  connect: z.lazy(() => LessonWhereUniqueInputObjectSchema).optional()
}).strict();
export const LessonCreateNestedOneWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.LessonCreateNestedOneWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateNestedOneWithoutAttemptsInput>;
export const LessonCreateNestedOneWithoutAttemptsInputObjectZodSchema = makeSchema();
