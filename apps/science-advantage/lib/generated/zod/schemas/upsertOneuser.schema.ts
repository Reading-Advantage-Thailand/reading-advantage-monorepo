import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userSelectObjectSchema as userSelectObjectSchema } from './objects/userSelect.schema';
import { userIncludeObjectSchema as userIncludeObjectSchema } from './objects/userInclude.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './objects/userWhereUniqueInput.schema';
import { userCreateInputObjectSchema as userCreateInputObjectSchema } from './objects/userCreateInput.schema';
import { userUncheckedCreateInputObjectSchema as userUncheckedCreateInputObjectSchema } from './objects/userUncheckedCreateInput.schema';
import { userUpdateInputObjectSchema as userUpdateInputObjectSchema } from './objects/userUpdateInput.schema';
import { userUncheckedUpdateInputObjectSchema as userUncheckedUpdateInputObjectSchema } from './objects/userUncheckedUpdateInput.schema';

export const userUpsertOneSchema: z.ZodType<Prisma.userUpsertArgs> = z.object({ select: userSelectObjectSchema.optional(), include: userIncludeObjectSchema.optional(), where: userWhereUniqueInputObjectSchema, create: z.union([ userCreateInputObjectSchema, userUncheckedCreateInputObjectSchema ]), update: z.union([ userUpdateInputObjectSchema, userUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.userUpsertArgs>;

export const userUpsertOneZodSchema = z.object({ select: userSelectObjectSchema.optional(), include: userIncludeObjectSchema.optional(), where: userWhereUniqueInputObjectSchema, create: z.union([ userCreateInputObjectSchema, userUncheckedCreateInputObjectSchema ]), update: z.union([ userUpdateInputObjectSchema, userUncheckedUpdateInputObjectSchema ]) }).strict();