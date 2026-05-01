import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasterySelectObjectSchema as StandardMasterySelectObjectSchema } from './objects/StandardMasterySelect.schema';
import { StandardMasteryIncludeObjectSchema as StandardMasteryIncludeObjectSchema } from './objects/StandardMasteryInclude.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './objects/StandardMasteryWhereUniqueInput.schema';

export const StandardMasteryFindUniqueSchema: z.ZodType<Prisma.StandardMasteryFindUniqueArgs> = z.object({ select: StandardMasterySelectObjectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), where: StandardMasteryWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.StandardMasteryFindUniqueArgs>;

export const StandardMasteryFindUniqueZodSchema = z.object({ select: StandardMasterySelectObjectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), where: StandardMasteryWhereUniqueInputObjectSchema }).strict();