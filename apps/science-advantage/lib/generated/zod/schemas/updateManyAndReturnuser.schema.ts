import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userSelectObjectSchema as userSelectObjectSchema } from './objects/userSelect.schema';
import { userUpdateManyMutationInputObjectSchema as userUpdateManyMutationInputObjectSchema } from './objects/userUpdateManyMutationInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './objects/userWhereInput.schema';

export const userUpdateManyAndReturnSchema: z.ZodType<Prisma.userUpdateManyAndReturnArgs> = z.object({ select: userSelectObjectSchema.optional(), data: userUpdateManyMutationInputObjectSchema, where: userWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.userUpdateManyAndReturnArgs>;

export const userUpdateManyAndReturnZodSchema = z.object({ select: userSelectObjectSchema.optional(), data: userUpdateManyMutationInputObjectSchema, where: userWhereInputObjectSchema.optional() }).strict();