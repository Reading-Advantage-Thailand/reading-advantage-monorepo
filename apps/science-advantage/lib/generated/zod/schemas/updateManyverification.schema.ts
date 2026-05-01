import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationUpdateManyMutationInputObjectSchema as verificationUpdateManyMutationInputObjectSchema } from './objects/verificationUpdateManyMutationInput.schema';
import { verificationWhereInputObjectSchema as verificationWhereInputObjectSchema } from './objects/verificationWhereInput.schema';

export const verificationUpdateManySchema: z.ZodType<Prisma.verificationUpdateManyArgs> = z.object({ data: verificationUpdateManyMutationInputObjectSchema, where: verificationWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.verificationUpdateManyArgs>;

export const verificationUpdateManyZodSchema = z.object({ data: verificationUpdateManyMutationInputObjectSchema, where: verificationWhereInputObjectSchema.optional() }).strict();