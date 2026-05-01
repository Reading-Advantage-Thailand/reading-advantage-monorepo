import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './objects/StandardWhereInput.schema';

export const StandardDeleteManySchema: z.ZodType<Prisma.StandardDeleteManyArgs> = z.object({ where: StandardWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.StandardDeleteManyArgs>;

export const StandardDeleteManyZodSchema = z.object({ where: StandardWhereInputObjectSchema.optional() }).strict();