import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userSelectObjectSchema as userSelectObjectSchema } from './objects/userSelect.schema';
import { userIncludeObjectSchema as userIncludeObjectSchema } from './objects/userInclude.schema';
import { userUpdateInputObjectSchema as userUpdateInputObjectSchema } from './objects/userUpdateInput.schema';
import { userUncheckedUpdateInputObjectSchema as userUncheckedUpdateInputObjectSchema } from './objects/userUncheckedUpdateInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './objects/userWhereUniqueInput.schema';

export const userUpdateOneSchema: z.ZodType<Prisma.userUpdateArgs> = z.object({ select: userSelectObjectSchema.optional(), include: userIncludeObjectSchema.optional(), data: z.union([userUpdateInputObjectSchema, userUncheckedUpdateInputObjectSchema]), where: userWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.userUpdateArgs>;

export const userUpdateOneZodSchema = z.object({ select: userSelectObjectSchema.optional(), include: userIncludeObjectSchema.optional(), data: z.union([userUpdateInputObjectSchema, userUncheckedUpdateInputObjectSchema]), where: userWhereUniqueInputObjectSchema }).strict();