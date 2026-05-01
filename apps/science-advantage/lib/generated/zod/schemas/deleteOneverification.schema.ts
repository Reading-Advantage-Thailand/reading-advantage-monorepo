import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './objects/verificationSelect.schema';
import { verificationWhereUniqueInputObjectSchema as verificationWhereUniqueInputObjectSchema } from './objects/verificationWhereUniqueInput.schema';

export const verificationDeleteOneSchema: z.ZodType<Prisma.verificationDeleteArgs> = z.object({ select: verificationSelectObjectSchema.optional(),  where: verificationWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.verificationDeleteArgs>;

export const verificationDeleteOneZodSchema = z.object({ select: verificationSelectObjectSchema.optional(),  where: verificationWhereUniqueInputObjectSchema }).strict();