import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardSelectObjectSchema as StandardSelectObjectSchema } from './objects/StandardSelect.schema';
import { StandardIncludeObjectSchema as StandardIncludeObjectSchema } from './objects/StandardInclude.schema';
import { StandardCreateInputObjectSchema as StandardCreateInputObjectSchema } from './objects/StandardCreateInput.schema';
import { StandardUncheckedCreateInputObjectSchema as StandardUncheckedCreateInputObjectSchema } from './objects/StandardUncheckedCreateInput.schema';

export const StandardCreateOneSchema: z.ZodType<Prisma.StandardCreateArgs> = z.object({ select: StandardSelectObjectSchema.optional(), include: StandardIncludeObjectSchema.optional(), data: z.union([StandardCreateInputObjectSchema, StandardUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.StandardCreateArgs>;

export const StandardCreateOneZodSchema = z.object({ select: StandardSelectObjectSchema.optional(), include: StandardIncludeObjectSchema.optional(), data: z.union([StandardCreateInputObjectSchema, StandardUncheckedCreateInputObjectSchema]) }).strict();