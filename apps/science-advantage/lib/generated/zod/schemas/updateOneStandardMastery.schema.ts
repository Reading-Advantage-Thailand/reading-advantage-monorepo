import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasterySelectObjectSchema as StandardMasterySelectObjectSchema } from './objects/StandardMasterySelect.schema';
import { StandardMasteryIncludeObjectSchema as StandardMasteryIncludeObjectSchema } from './objects/StandardMasteryInclude.schema';
import { StandardMasteryUpdateInputObjectSchema as StandardMasteryUpdateInputObjectSchema } from './objects/StandardMasteryUpdateInput.schema';
import { StandardMasteryUncheckedUpdateInputObjectSchema as StandardMasteryUncheckedUpdateInputObjectSchema } from './objects/StandardMasteryUncheckedUpdateInput.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './objects/StandardMasteryWhereUniqueInput.schema';

export const StandardMasteryUpdateOneSchema: z.ZodType<Prisma.StandardMasteryUpdateArgs> = z.object({ select: StandardMasterySelectObjectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), data: z.union([StandardMasteryUpdateInputObjectSchema, StandardMasteryUncheckedUpdateInputObjectSchema]), where: StandardMasteryWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.StandardMasteryUpdateArgs>;

export const StandardMasteryUpdateOneZodSchema = z.object({ select: StandardMasterySelectObjectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), data: z.union([StandardMasteryUpdateInputObjectSchema, StandardMasteryUncheckedUpdateInputObjectSchema]), where: StandardMasteryWhereUniqueInputObjectSchema }).strict();