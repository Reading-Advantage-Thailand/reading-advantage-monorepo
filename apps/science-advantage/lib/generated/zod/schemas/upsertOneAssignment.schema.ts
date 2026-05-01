import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentSelectObjectSchema as AssignmentSelectObjectSchema } from './objects/AssignmentSelect.schema';
import { AssignmentIncludeObjectSchema as AssignmentIncludeObjectSchema } from './objects/AssignmentInclude.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './objects/AssignmentWhereUniqueInput.schema';
import { AssignmentCreateInputObjectSchema as AssignmentCreateInputObjectSchema } from './objects/AssignmentCreateInput.schema';
import { AssignmentUncheckedCreateInputObjectSchema as AssignmentUncheckedCreateInputObjectSchema } from './objects/AssignmentUncheckedCreateInput.schema';
import { AssignmentUpdateInputObjectSchema as AssignmentUpdateInputObjectSchema } from './objects/AssignmentUpdateInput.schema';
import { AssignmentUncheckedUpdateInputObjectSchema as AssignmentUncheckedUpdateInputObjectSchema } from './objects/AssignmentUncheckedUpdateInput.schema';

export const AssignmentUpsertOneSchema: z.ZodType<Prisma.AssignmentUpsertArgs> = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), where: AssignmentWhereUniqueInputObjectSchema, create: z.union([ AssignmentCreateInputObjectSchema, AssignmentUncheckedCreateInputObjectSchema ]), update: z.union([ AssignmentUpdateInputObjectSchema, AssignmentUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.AssignmentUpsertArgs>;

export const AssignmentUpsertOneZodSchema = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), where: AssignmentWhereUniqueInputObjectSchema, create: z.union([ AssignmentCreateInputObjectSchema, AssignmentUncheckedCreateInputObjectSchema ]), update: z.union([ AssignmentUpdateInputObjectSchema, AssignmentUncheckedUpdateInputObjectSchema ]) }).strict();