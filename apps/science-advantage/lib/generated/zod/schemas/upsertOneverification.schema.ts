import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './objects/verificationSelect.schema';
import { verificationWhereUniqueInputObjectSchema as verificationWhereUniqueInputObjectSchema } from './objects/verificationWhereUniqueInput.schema';
import { verificationCreateInputObjectSchema as verificationCreateInputObjectSchema } from './objects/verificationCreateInput.schema';
import { verificationUncheckedCreateInputObjectSchema as verificationUncheckedCreateInputObjectSchema } from './objects/verificationUncheckedCreateInput.schema';
import { verificationUpdateInputObjectSchema as verificationUpdateInputObjectSchema } from './objects/verificationUpdateInput.schema';
import { verificationUncheckedUpdateInputObjectSchema as verificationUncheckedUpdateInputObjectSchema } from './objects/verificationUncheckedUpdateInput.schema';

export const verificationUpsertOneSchema: z.ZodType<Prisma.verificationUpsertArgs> = z.object({ select: verificationSelectObjectSchema.optional(),  where: verificationWhereUniqueInputObjectSchema, create: z.union([ verificationCreateInputObjectSchema, verificationUncheckedCreateInputObjectSchema ]), update: z.union([ verificationUpdateInputObjectSchema, verificationUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.verificationUpsertArgs>;

export const verificationUpsertOneZodSchema = z.object({ select: verificationSelectObjectSchema.optional(),  where: verificationWhereUniqueInputObjectSchema, create: z.union([ verificationCreateInputObjectSchema, verificationUncheckedCreateInputObjectSchema ]), update: z.union([ verificationUpdateInputObjectSchema, verificationUncheckedUpdateInputObjectSchema ]) }).strict();