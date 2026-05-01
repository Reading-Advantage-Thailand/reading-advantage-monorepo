import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardUpdateManyMutationInputObjectSchema as StandardUpdateManyMutationInputObjectSchema } from './objects/StandardUpdateManyMutationInput.schema';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './objects/StandardWhereInput.schema';

export const StandardUpdateManySchema: z.ZodType<Prisma.StandardUpdateManyArgs> = z.object({ data: StandardUpdateManyMutationInputObjectSchema, where: StandardWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.StandardUpdateManyArgs>;

export const StandardUpdateManyZodSchema = z.object({ data: StandardUpdateManyMutationInputObjectSchema, where: StandardWhereInputObjectSchema.optional() }).strict();