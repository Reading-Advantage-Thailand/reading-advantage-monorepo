import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './objects/verificationSelect.schema';
import { verificationCreateInputObjectSchema as verificationCreateInputObjectSchema } from './objects/verificationCreateInput.schema';
import { verificationUncheckedCreateInputObjectSchema as verificationUncheckedCreateInputObjectSchema } from './objects/verificationUncheckedCreateInput.schema';

export const verificationCreateOneSchema: z.ZodType<Prisma.verificationCreateArgs> = z.object({ select: verificationSelectObjectSchema.optional(),  data: z.union([verificationCreateInputObjectSchema, verificationUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.verificationCreateArgs>;

export const verificationCreateOneZodSchema = z.object({ select: verificationSelectObjectSchema.optional(),  data: z.union([verificationCreateInputObjectSchema, verificationUncheckedCreateInputObjectSchema]) }).strict();