import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentSelectObjectSchema as AssignmentSelectObjectSchema } from './objects/AssignmentSelect.schema';
import { AssignmentUpdateManyMutationInputObjectSchema as AssignmentUpdateManyMutationInputObjectSchema } from './objects/AssignmentUpdateManyMutationInput.schema';
import { AssignmentWhereInputObjectSchema as AssignmentWhereInputObjectSchema } from './objects/AssignmentWhereInput.schema';

export const AssignmentUpdateManyAndReturnSchema: z.ZodType<Prisma.AssignmentUpdateManyAndReturnArgs> = z.object({ select: AssignmentSelectObjectSchema.optional(), data: AssignmentUpdateManyMutationInputObjectSchema, where: AssignmentWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.AssignmentUpdateManyAndReturnArgs>;

export const AssignmentUpdateManyAndReturnZodSchema = z.object({ select: AssignmentSelectObjectSchema.optional(), data: AssignmentUpdateManyMutationInputObjectSchema, where: AssignmentWhereInputObjectSchema.optional() }).strict();