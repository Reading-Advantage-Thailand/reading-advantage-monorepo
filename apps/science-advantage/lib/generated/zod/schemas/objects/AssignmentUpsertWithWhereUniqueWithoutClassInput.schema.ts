import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithoutClassInputObjectSchema as AssignmentUpdateWithoutClassInputObjectSchema } from './AssignmentUpdateWithoutClassInput.schema';
import { AssignmentUncheckedUpdateWithoutClassInputObjectSchema as AssignmentUncheckedUpdateWithoutClassInputObjectSchema } from './AssignmentUncheckedUpdateWithoutClassInput.schema';
import { AssignmentCreateWithoutClassInputObjectSchema as AssignmentCreateWithoutClassInputObjectSchema } from './AssignmentCreateWithoutClassInput.schema';
import { AssignmentUncheckedCreateWithoutClassInputObjectSchema as AssignmentUncheckedCreateWithoutClassInputObjectSchema } from './AssignmentUncheckedCreateWithoutClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => AssignmentUpdateWithoutClassInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateWithoutClassInputObjectSchema)]),
  create: z.union([z.lazy(() => AssignmentCreateWithoutClassInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutClassInputObjectSchema)])
}).strict();
export const AssignmentUpsertWithWhereUniqueWithoutClassInputObjectSchema: z.ZodType<Prisma.AssignmentUpsertWithWhereUniqueWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpsertWithWhereUniqueWithoutClassInput>;
export const AssignmentUpsertWithWhereUniqueWithoutClassInputObjectZodSchema = makeSchema();
