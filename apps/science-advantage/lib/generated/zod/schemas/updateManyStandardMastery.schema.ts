import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasteryUpdateManyMutationInputObjectSchema as StandardMasteryUpdateManyMutationInputObjectSchema } from './objects/StandardMasteryUpdateManyMutationInput.schema';
import { StandardMasteryWhereInputObjectSchema as StandardMasteryWhereInputObjectSchema } from './objects/StandardMasteryWhereInput.schema';

export const StandardMasteryUpdateManySchema: z.ZodType<Prisma.StandardMasteryUpdateManyArgs> = z.object({ data: StandardMasteryUpdateManyMutationInputObjectSchema, where: StandardMasteryWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.StandardMasteryUpdateManyArgs>;

export const StandardMasteryUpdateManyZodSchema = z.object({ data: StandardMasteryUpdateManyMutationInputObjectSchema, where: StandardMasteryWhereInputObjectSchema.optional() }).strict();