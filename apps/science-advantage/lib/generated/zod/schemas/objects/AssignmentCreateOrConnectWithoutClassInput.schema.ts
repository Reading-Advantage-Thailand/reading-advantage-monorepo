import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentCreateWithoutClassInputObjectSchema as AssignmentCreateWithoutClassInputObjectSchema } from './AssignmentCreateWithoutClassInput.schema';
import { AssignmentUncheckedCreateWithoutClassInputObjectSchema as AssignmentUncheckedCreateWithoutClassInputObjectSchema } from './AssignmentUncheckedCreateWithoutClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => AssignmentCreateWithoutClassInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutClassInputObjectSchema)])
}).strict();
export const AssignmentCreateOrConnectWithoutClassInputObjectSchema: z.ZodType<Prisma.AssignmentCreateOrConnectWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateOrConnectWithoutClassInput>;
export const AssignmentCreateOrConnectWithoutClassInputObjectZodSchema = makeSchema();
