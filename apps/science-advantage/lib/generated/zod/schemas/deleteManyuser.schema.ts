import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './objects/userWhereInput.schema';

export const userDeleteManySchema: z.ZodType<Prisma.userDeleteManyArgs> = z.object({ where: userWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.userDeleteManyArgs>;

export const userDeleteManyZodSchema = z.object({ where: userWhereInputObjectSchema.optional() }).strict();