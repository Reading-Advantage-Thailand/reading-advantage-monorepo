import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentSelectObjectSchema as AssignmentSelectObjectSchema } from './objects/AssignmentSelect.schema';
import { AssignmentCreateManyInputObjectSchema as AssignmentCreateManyInputObjectSchema } from './objects/AssignmentCreateManyInput.schema';

export const AssignmentCreateManyAndReturnSchema: z.ZodType<Prisma.AssignmentCreateManyAndReturnArgs> = z.object({ select: AssignmentSelectObjectSchema.optional(), data: z.union([ AssignmentCreateManyInputObjectSchema, z.array(AssignmentCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.AssignmentCreateManyAndReturnArgs>;

export const AssignmentCreateManyAndReturnZodSchema = z.object({ select: AssignmentSelectObjectSchema.optional(), data: z.union([ AssignmentCreateManyInputObjectSchema, z.array(AssignmentCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();