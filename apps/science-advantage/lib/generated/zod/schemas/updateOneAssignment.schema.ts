import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentSelectObjectSchema as AssignmentSelectObjectSchema } from './objects/AssignmentSelect.schema';
import { AssignmentIncludeObjectSchema as AssignmentIncludeObjectSchema } from './objects/AssignmentInclude.schema';
import { AssignmentUpdateInputObjectSchema as AssignmentUpdateInputObjectSchema } from './objects/AssignmentUpdateInput.schema';
import { AssignmentUncheckedUpdateInputObjectSchema as AssignmentUncheckedUpdateInputObjectSchema } from './objects/AssignmentUncheckedUpdateInput.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './objects/AssignmentWhereUniqueInput.schema';

export const AssignmentUpdateOneSchema: z.ZodType<Prisma.AssignmentUpdateArgs> = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), data: z.union([AssignmentUpdateInputObjectSchema, AssignmentUncheckedUpdateInputObjectSchema]), where: AssignmentWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.AssignmentUpdateArgs>;

export const AssignmentUpdateOneZodSchema = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), data: z.union([AssignmentUpdateInputObjectSchema, AssignmentUncheckedUpdateInputObjectSchema]), where: AssignmentWhereUniqueInputObjectSchema }).strict();