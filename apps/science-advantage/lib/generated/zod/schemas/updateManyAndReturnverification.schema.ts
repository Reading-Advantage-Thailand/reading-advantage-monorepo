import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './objects/verificationSelect.schema';
import { verificationUpdateManyMutationInputObjectSchema as verificationUpdateManyMutationInputObjectSchema } from './objects/verificationUpdateManyMutationInput.schema';
import { verificationWhereInputObjectSchema as verificationWhereInputObjectSchema } from './objects/verificationWhereInput.schema';

export const verificationUpdateManyAndReturnSchema: z.ZodType<Prisma.verificationUpdateManyAndReturnArgs> = z.object({ select: verificationSelectObjectSchema.optional(), data: verificationUpdateManyMutationInputObjectSchema, where: verificationWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.verificationUpdateManyAndReturnArgs>;

export const verificationUpdateManyAndReturnZodSchema = z.object({ select: verificationSelectObjectSchema.optional(), data: verificationUpdateManyMutationInputObjectSchema, where: verificationWhereInputObjectSchema.optional() }).strict();