import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptCreateWithoutStudentInputObjectSchema as AttemptCreateWithoutStudentInputObjectSchema } from './AttemptCreateWithoutStudentInput.schema';
import { AttemptUncheckedCreateWithoutStudentInputObjectSchema as AttemptUncheckedCreateWithoutStudentInputObjectSchema } from './AttemptUncheckedCreateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => AttemptCreateWithoutStudentInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutStudentInputObjectSchema)])
}).strict();
export const AttemptCreateOrConnectWithoutStudentInputObjectSchema: z.ZodType<Prisma.AttemptCreateOrConnectWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateOrConnectWithoutStudentInput>;
export const AttemptCreateOrConnectWithoutStudentInputObjectZodSchema = makeSchema();
