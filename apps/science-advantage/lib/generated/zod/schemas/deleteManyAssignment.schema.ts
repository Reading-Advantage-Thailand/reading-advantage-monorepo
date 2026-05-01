import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentWhereInputObjectSchema as AssignmentWhereInputObjectSchema } from './objects/AssignmentWhereInput.schema';

export const AssignmentDeleteManySchema: z.ZodType<Prisma.AssignmentDeleteManyArgs> = z.object({ where: AssignmentWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.AssignmentDeleteManyArgs>;

export const AssignmentDeleteManyZodSchema = z.object({ where: AssignmentWhereInputObjectSchema.optional() }).strict();