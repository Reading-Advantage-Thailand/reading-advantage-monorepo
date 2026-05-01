import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardSelectObjectSchema as StandardSelectObjectSchema } from './objects/StandardSelect.schema';
import { StandardIncludeObjectSchema as StandardIncludeObjectSchema } from './objects/StandardInclude.schema';
import { StandardUpdateInputObjectSchema as StandardUpdateInputObjectSchema } from './objects/StandardUpdateInput.schema';
import { StandardUncheckedUpdateInputObjectSchema as StandardUncheckedUpdateInputObjectSchema } from './objects/StandardUncheckedUpdateInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './objects/StandardWhereUniqueInput.schema';

export const StandardUpdateOneSchema: z.ZodType<Prisma.StandardUpdateArgs> = z.object({ select: StandardSelectObjectSchema.optional(), include: StandardIncludeObjectSchema.optional(), data: z.union([StandardUpdateInputObjectSchema, StandardUncheckedUpdateInputObjectSchema]), where: StandardWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.StandardUpdateArgs>;

export const StandardUpdateOneZodSchema = z.object({ select: StandardSelectObjectSchema.optional(), include: StandardIncludeObjectSchema.optional(), data: z.union([StandardUpdateInputObjectSchema, StandardUncheckedUpdateInputObjectSchema]), where: StandardWhereUniqueInputObjectSchema }).strict();