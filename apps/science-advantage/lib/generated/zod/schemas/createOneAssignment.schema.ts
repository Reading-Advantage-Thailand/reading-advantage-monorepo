import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { AssignmentSelectObjectSchema as AssignmentSelectObjectSchema } from './objects/AssignmentSelect.schema';
import { AssignmentIncludeObjectSchema as AssignmentIncludeObjectSchema } from './objects/AssignmentInclude.schema';
import { AssignmentCreateInputObjectSchema as AssignmentCreateInputObjectSchema } from './objects/AssignmentCreateInput.schema';
import { AssignmentUncheckedCreateInputObjectSchema as AssignmentUncheckedCreateInputObjectSchema } from './objects/AssignmentUncheckedCreateInput.schema';

export const AssignmentCreateOneSchema: z.ZodType<Prisma.AssignmentCreateArgs> = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), data: z.union([AssignmentCreateInputObjectSchema, AssignmentUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.AssignmentCreateArgs>;

export const AssignmentCreateOneZodSchema = z.object({ select: AssignmentSelectObjectSchema.optional(), include: AssignmentIncludeObjectSchema.optional(), data: z.union([AssignmentCreateInputObjectSchema, AssignmentUncheckedCreateInputObjectSchema]) }).strict();