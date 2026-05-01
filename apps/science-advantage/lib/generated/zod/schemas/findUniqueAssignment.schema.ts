import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentSelectObjectSchema as AssignmentSelectObjectSchema } from './objects/AssignmentSelect.schema';
import { AssignmentIncludeObjectSchema as AssignmentIncludeObjectSchema } from './objects/AssignmentInclude.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './objects/AssignmentWhereUniqueInput.schema';

export const AssignmentFindUniqueSchema: z.ZodType<Prisma.AssignmentFindUniqueArgs> = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), where: AssignmentWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.AssignmentFindUniqueArgs>;

export const AssignmentFindUniqueZodSchema = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), where: AssignmentWhereUniqueInputObjectSchema }).strict();