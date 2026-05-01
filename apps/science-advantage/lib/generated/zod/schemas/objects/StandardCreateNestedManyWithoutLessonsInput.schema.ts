import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardCreateWithoutLessonsInputObjectSchema as StandardCreateWithoutLessonsInputObjectSchema } from './StandardCreateWithoutLessonsInput.schema';
import { StandardUncheckedCreateWithoutLessonsInputObjectSchema as StandardUncheckedCreateWithoutLessonsInputObjectSchema } from './StandardUncheckedCreateWithoutLessonsInput.schema';
import { StandardCreateOrConnectWithoutLessonsInputObjectSchema as StandardCreateOrConnectWithoutLessonsInputObjectSchema } from './StandardCreateOrConnectWithoutLessonsInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardCreateWithoutLessonsInputObjectSchema), z.lazy(() => StandardCreateWithoutLessonsInputObjectSchema).array(), z.lazy(() => StandardUncheckedCreateWithoutLessonsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutLessonsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => StandardCreateOrConnectWithoutLessonsInputObjectSchema), z.lazy(() => StandardCreateOrConnectWithoutLessonsInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const StandardCreateNestedManyWithoutLessonsInputObjectSchema: z.ZodType<Prisma.StandardCreateNestedManyWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardCreateNestedManyWithoutLessonsInput>;
export const StandardCreateNestedManyWithoutLessonsInputObjectZodSchema = makeSchema();
