import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardSelectObjectSchema as StandardSelectObjectSchema } from './objects/StandardSelect.schema';
import { StandardIncludeObjectSchema as StandardIncludeObjectSchema } from './objects/StandardInclude.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './objects/StandardWhereUniqueInput.schema';
import { StandardCreateInputObjectSchema as StandardCreateInputObjectSchema } from './objects/StandardCreateInput.schema';
import { StandardUncheckedCreateInputObjectSchema as StandardUncheckedCreateInputObjectSchema } from './objects/StandardUncheckedCreateInput.schema';
import { StandardUpdateInputObjectSchema as StandardUpdateInputObjectSchema } from './objects/StandardUpdateInput.schema';
import { StandardUncheckedUpdateInputObjectSchema as StandardUncheckedUpdateInputObjectSchema } from './objects/StandardUncheckedUpdateInput.schema';

export const StandardUpsertOneSchema: z.ZodType<Prisma.StandardUpsertArgs> = z.object({ select: StandardSelectObjectSchema.optional(), include: StandardIncludeObjectSchema.optional(), where: StandardWhereUniqueInputObjectSchema, create: z.union([ StandardCreateInputObjectSchema, StandardUncheckedCreateInputObjectSchema ]), update: z.union([ StandardUpdateInputObjectSchema, StandardUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.StandardUpsertArgs>;

export const StandardUpsertOneZodSchema = z.object({ select: StandardSelectObjectSchema.optional(), include: StandardIncludeObjectSchema.optional(), where: StandardWhereUniqueInputObjectSchema, create: z.union([ StandardCreateInputObjectSchema, StandardUncheckedCreateInputObjectSchema ]), update: z.union([ StandardUpdateInputObjectSchema, StandardUncheckedUpdateInputObjectSchema ]) }).strict();