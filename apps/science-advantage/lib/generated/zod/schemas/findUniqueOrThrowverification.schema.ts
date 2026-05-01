import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './objects/verificationSelect.schema';
import { verificationWhereUniqueInputObjectSchema as verificationWhereUniqueInputObjectSchema } from './objects/verificationWhereUniqueInput.schema';

export const verificationFindUniqueOrThrowSchema: z.ZodType<Prisma.verificationFindUniqueOrThrowArgs> = z.object({ select: verificationSelectObjectSchema.optional(),  where: verificationWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.verificationFindUniqueOrThrowArgs>;

export const verificationFindUniqueOrThrowZodSchema = z.object({ select: verificationSelectObjectSchema.optional(),  where: verificationWhereUniqueInputObjectSchema }).strict();