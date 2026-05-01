import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationWhereInputObjectSchema as verificationWhereInputObjectSchema } from './objects/verificationWhereInput.schema';

export const verificationDeleteManySchema: z.ZodType<Prisma.verificationDeleteManyArgs> = z.object({ where: verificationWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.verificationDeleteManyArgs>;

export const verificationDeleteManyZodSchema = z.object({ where: verificationWhereInputObjectSchema.optional() }).strict();