import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userUpdateManyMutationInputObjectSchema as userUpdateManyMutationInputObjectSchema } from './objects/userUpdateManyMutationInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './objects/userWhereInput.schema';

export const userUpdateManySchema: z.ZodType<Prisma.userUpdateManyArgs> = z.object({ data: userUpdateManyMutationInputObjectSchema, where: userWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.userUpdateManyArgs>;

export const userUpdateManyZodSchema = z.object({ data: userUpdateManyMutationInputObjectSchema, where: userWhereInputObjectSchema.optional() }).strict();