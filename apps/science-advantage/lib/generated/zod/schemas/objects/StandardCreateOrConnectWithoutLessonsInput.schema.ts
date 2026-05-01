import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardCreateWithoutLessonsInputObjectSchema as StandardCreateWithoutLessonsInputObjectSchema } from './StandardCreateWithoutLessonsInput.schema';
import { StandardUncheckedCreateWithoutLessonsInputObjectSchema as StandardUncheckedCreateWithoutLessonsInputObjectSchema } from './StandardUncheckedCreateWithoutLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => StandardCreateWithoutLessonsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutLessonsInputObjectSchema)])
}).strict();
export const StandardCreateOrConnectWithoutLessonsInputObjectSchema: z.ZodType<Prisma.StandardCreateOrConnectWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardCreateOrConnectWithoutLessonsInput>;
export const StandardCreateOrConnectWithoutLessonsInputObjectZodSchema = makeSchema();
