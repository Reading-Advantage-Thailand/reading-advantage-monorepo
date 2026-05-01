import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasterySelectObjectSchema as StandardMasterySelectObjectSchema } from './objects/StandardMasterySelect.schema';
import { StandardMasteryIncludeObjectSchema as StandardMasteryIncludeObjectSchema } from './objects/StandardMasteryInclude.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './objects/StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryCreateInputObjectSchema as StandardMasteryCreateInputObjectSchema } from './objects/StandardMasteryCreateInput.schema';
import { StandardMasteryUncheckedCreateInputObjectSchema as StandardMasteryUncheckedCreateInputObjectSchema } from './objects/StandardMasteryUncheckedCreateInput.schema';
import { StandardMasteryUpdateInputObjectSchema as StandardMasteryUpdateInputObjectSchema } from './objects/StandardMasteryUpdateInput.schema';
import { StandardMasteryUncheckedUpdateInputObjectSchema as StandardMasteryUncheckedUpdateInputObjectSchema } from './objects/StandardMasteryUncheckedUpdateInput.schema';

export const StandardMasteryUpsertOneSchema: z.ZodType<Prisma.StandardMasteryUpsertArgs> = z.object({ select: StandardMasterySelectObjectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), where: StandardMasteryWhereUniqueInputObjectSchema, create: z.union([ StandardMasteryCreateInputObjectSchema, StandardMasteryUncheckedCreateInputObjectSchema ]), update: z.union([ StandardMasteryUpdateInputObjectSchema, StandardMasteryUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.StandardMasteryUpsertArgs>;

export const StandardMasteryUpsertOneZodSchema = z.object({ select: StandardMasterySelectObjectSchema.optional(), include: StandardMasteryIncludeObjectSchema.optional(), where: StandardMasteryWhereUniqueInputObjectSchema, create: z.union([ StandardMasteryCreateInputObjectSchema, StandardMasteryUncheckedCreateInputObjectSchema ]), update: z.union([ StandardMasteryUpdateInputObjectSchema, StandardMasteryUncheckedUpdateInputObjectSchema ]) }).strict();