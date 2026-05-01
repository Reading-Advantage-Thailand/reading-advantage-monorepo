import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasterySelectObjectSchema as StandardMasterySelectObjectSchema } from './objects/StandardMasterySelect.schema';
import { StandardMasteryIncludeObjectSchema as StandardMasteryIncludeObjectSchema } from './objects/StandardMasteryInclude.schema';
import { StandardMasteryCreateInputObjectSchema as StandardMasteryCreateInputObjectSchema } from './objects/StandardMasteryCreateInput.schema';
import { StandardMasteryUncheckedCreateInputObjectSchema as StandardMasteryUncheckedCreateInputObjectSchema } from './objects/StandardMasteryUncheckedCreateInput.schema';

export const StandardMasteryCreateOneSchema: z.ZodType<Prisma.StandardMasteryCreateArgs> = z.object({ select: StandardMasterySelectObjectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), data: z.union([StandardMasteryCreateInputObjectSchema, StandardMasteryUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.StandardMasteryCreateArgs>;

export const StandardMasteryCreateOneZodSchema = z.object({ select: StandardMasterySelectObjectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), data: z.union([StandardMasteryCreateInputObjectSchema, StandardMasteryUncheckedCreateInputObjectSchema]) }).strict();