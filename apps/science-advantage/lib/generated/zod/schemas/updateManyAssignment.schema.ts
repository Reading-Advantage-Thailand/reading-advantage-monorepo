import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentUpdateManyMutationInputObjectSchema as AssignmentUpdateManyMutationInputObjectSchema } from './objects/AssignmentUpdateManyMutationInput.schema';
import { AssignmentWhereInputObjectSchema as AssignmentWhereInputObjectSchema } from './objects/AssignmentWhereInput.schema';

export const AssignmentUpdateManySchema: z.ZodType<Prisma.AssignmentUpdateManyArgs> = z.object({ data: AssignmentUpdateManyMutationInputObjectSchema, where: AssignmentWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.AssignmentUpdateManyArgs>;

export const AssignmentUpdateManyZodSchema = z.object({ data: AssignmentUpdateManyMutationInputObjectSchema, where: AssignmentWhereInputObjectSchema.optional() }).strict();