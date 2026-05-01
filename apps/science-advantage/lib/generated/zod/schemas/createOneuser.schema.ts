import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userSelectObjectSchema as userSelectObjectSchema } from './objects/userSelect.schema';
import { userIncludeObjectSchema as userIncludeObjectSchema } from './objects/userInclude.schema';
import { userCreateInputObjectSchema as userCreateInputObjectSchema } from './objects/userCreateInput.schema';
import { userUncheckedCreateInputObjectSchema as userUncheckedCreateInputObjectSchema } from './objects/userUncheckedCreateInput.schema';

export const userCreateOneSchema: z.ZodType<Prisma.userCreateArgs> = z.object({ select: userSelectObjectSchema.optional(), include: userIncludeObjectSchema.optional(), data: z.union([userCreateInputObjectSchema, userUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.userCreateArgs>;

export const userCreateOneZodSchema = z.object({ select: userSelectObjectSchema.optional(), include: userIncludeObjectSchema.optional(), data: z.union([userCreateInputObjectSchema, userUncheckedCreateInputObjectSchema]) }).strict();