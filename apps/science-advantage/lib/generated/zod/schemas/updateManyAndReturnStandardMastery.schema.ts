import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasterySelectObjectSchema as StandardMasterySelectObjectSchema } from './objects/StandardMasterySelect.schema';
import { StandardMasteryUpdateManyMutationInputObjectSchema as StandardMasteryUpdateManyMutationInputObjectSchema } from './objects/StandardMasteryUpdateManyMutationInput.schema';
import { StandardMasteryWhereInputObjectSchema as StandardMasteryWhereInputObjectSchema } from './objects/StandardMasteryWhereInput.schema';

export const StandardMasteryUpdateManyAndReturnSchema: z.ZodType<Prisma.StandardMasteryUpdateManyAndReturnArgs> = z.object({ select: StandardMasterySelectObjectSchema.optional(), data: StandardMasteryUpdateManyMutationInputObjectSchema, where: StandardMasteryWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.StandardMasteryUpdateManyAndReturnArgs>;

export const StandardMasteryUpdateManyAndReturnZodSchema = z.object({ select: StandardMasterySelectObjectSchema.optional(), data: StandardMasteryUpdateManyMutationInputObjectSchema, where: StandardMasteryWhereInputObjectSchema.optional() }).strict();