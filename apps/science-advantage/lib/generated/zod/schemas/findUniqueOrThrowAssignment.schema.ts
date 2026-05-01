import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentSelectObjectSchema as AssignmentSelectObjectSchema } from './objects/AssignmentSelect.schema';
import { AssignmentIncludeObjectSchema as AssignmentIncludeObjectSchema } from './objects/AssignmentInclude.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './objects/AssignmentWhereUniqueInput.schema';

export const AssignmentFindUniqueOrThrowSchema: z.ZodType<Prisma.AssignmentFindUniqueOrThrowArgs> = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), where: AssignmentWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.AssignmentFindUniqueOrThrowArgs>;

export const AssignmentFindUniqueOrThrowZodSchema = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), where: AssignmentWhereUniqueInputObjectSchema }).strict();