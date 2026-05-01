import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithoutClassInputObjectSchema as AssignmentUpdateWithoutClassInputObjectSchema } from './AssignmentUpdateWithoutClassInput.schema';
import { AssignmentUncheckedUpdateWithoutClassInputObjectSchema as AssignmentUncheckedUpdateWithoutClassInputObjectSchema } from './AssignmentUncheckedUpdateWithoutClassInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => AssignmentUpdateWithoutClassInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateWithoutClassInputObjectSchema)])
}).strict();
export const AssignmentUpdateWithWhereUniqueWithoutClassInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateWithWhereUniqueWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateWithWhereUniqueWithoutClassInput>;
export const AssignmentUpdateWithWhereUniqueWithoutClassInputObjectZodSchema = makeSchema();
