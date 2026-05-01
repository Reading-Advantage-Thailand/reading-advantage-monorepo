import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardSelectObjectSchema as StandardSelectObjectSchema } from './objects/StandardSelect.schema';
import { StandardUpdateManyMutationInputObjectSchema as StandardUpdateManyMutationInputObjectSchema } from './objects/StandardUpdateManyMutationInput.schema';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './objects/StandardWhereInput.schema';

export const StandardUpdateManyAndReturnSchema: z.ZodType<Prisma.StandardUpdateManyAndReturnArgs> = z.object({ select: StandardSelectObjectSchema.optional(), data: StandardUpdateManyMutationInputObjectSchema, where: StandardWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.StandardUpdateManyAndReturnArgs>;

export const StandardUpdateManyAndReturnZodSchema = z.object({ select: StandardSelectObjectSchema.optional(), data: StandardUpdateManyMutationInputObjectSchema, where: StandardWhereInputObjectSchema.optional() }).strict();