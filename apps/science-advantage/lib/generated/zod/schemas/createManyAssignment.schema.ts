import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentCreateManyInputObjectSchema as AssignmentCreateManyInputObjectSchema } from './objects/AssignmentCreateManyInput.schema';

export const AssignmentCreateManySchema: z.ZodType<Prisma.AssignmentCreateManyArgs> = z.object({ data: z.union([ AssignmentCreateManyInputObjectSchema, z.array(AssignmentCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.AssignmentCreateManyArgs>;

export const AssignmentCreateManyZodSchema = z.object({ data: z.union([ AssignmentCreateManyInputObjectSchema, z.array(AssignmentCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();