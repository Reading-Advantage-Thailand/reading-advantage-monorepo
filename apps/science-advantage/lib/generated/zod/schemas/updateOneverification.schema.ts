import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './objects/verificationSelect.schema';
import { verificationUpdateInputObjectSchema as verificationUpdateInputObjectSchema } from './objects/verificationUpdateInput.schema';
import { verificationUncheckedUpdateInputObjectSchema as verificationUncheckedUpdateInputObjectSchema } from './objects/verificationUncheckedUpdateInput.schema';
import { verificationWhereUniqueInputObjectSchema as verificationWhereUniqueInputObjectSchema } from './objects/verificationWhereUniqueInput.schema';

export const verificationUpdateOneSchema: z.ZodType<Prisma.verificationUpdateArgs> = z.object({ select: verificationSelectObjectSchema.optional(),  data: z.union([verificationUpdateInputObjectSchema, verificationUncheckedUpdateInputObjectSchema]), where: verificationWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.verificationUpdateArgs>;

export const verificationUpdateOneZodSchema = z.object({ select: verificationSelectObjectSchema.optional(),  data: z.union([verificationUpdateInputObjectSchema, verificationUncheckedUpdateInputObjectSchema]), where: verificationWhereUniqueInputObjectSchema }).strict();