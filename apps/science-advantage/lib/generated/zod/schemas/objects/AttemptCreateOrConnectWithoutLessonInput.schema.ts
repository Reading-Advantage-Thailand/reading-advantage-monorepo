import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptCreateWithoutLessonInputObjectSchema as AttemptCreateWithoutLessonInputObjectSchema } from './AttemptCreateWithoutLessonInput.schema';
import { AttemptUncheckedCreateWithoutLessonInputObjectSchema as AttemptUncheckedCreateWithoutLessonInputObjectSchema } from './AttemptUncheckedCreateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => AttemptCreateWithoutLessonInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutLessonInputObjectSchema)])
}).strict();
export const AttemptCreateOrConnectWithoutLessonInputObjectSchema: z.ZodType<Prisma.AttemptCreateOrConnectWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateOrConnectWithoutLessonInput>;
export const AttemptCreateOrConnectWithoutLessonInputObjectZodSchema = makeSchema();
