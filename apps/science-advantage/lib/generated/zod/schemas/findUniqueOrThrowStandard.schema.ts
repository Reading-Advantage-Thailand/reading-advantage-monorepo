import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardSelectObjectSchema as StandardSelectObjectSchema } from './objects/StandardSelect.schema';
import { StandardIncludeObjectSchema as StandardIncludeObjectSchema } from './objects/StandardInclude.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './objects/StandardWhereUniqueInput.schema';

export const StandardFindUniqueOrThrowSchema: z.ZodType<Prisma.StandardFindUniqueOrThrowArgs> = z.object({ select: StandardSelectObjectSchema.optional(), include: StandardIncludeObjectSchema.optional(), where: StandardWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.StandardFindUniqueOrThrowArgs>;

export const StandardFindUniqueOrThrowZodSchema = z.object({ select: StandardSelectObjectSchema.optional(), include: StandardIncludeObjectSchema.optional(), where: StandardWhereUniqueInputObjectSchema }).strict();