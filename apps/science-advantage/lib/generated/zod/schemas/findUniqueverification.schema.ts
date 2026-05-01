import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './objects/verificationSelect.schema';
import { verificationWhereUniqueInputObjectSchema as verificationWhereUniqueInputObjectSchema } from './objects/verificationWhereUniqueInput.schema';

export const verificationFindUniqueSchema: z.ZodType<Prisma.verificationFindUniqueArgs> = z.object({ select: verificationSelectObjectSchema.optional(),  where: verificationWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.verificationFindUniqueArgs>;

export const verificationFindUniqueZodSchema = z.object({ select: verificationSelectObjectSchema.optional(),  where: verificationWhereUniqueInputObjectSchema }).strict();