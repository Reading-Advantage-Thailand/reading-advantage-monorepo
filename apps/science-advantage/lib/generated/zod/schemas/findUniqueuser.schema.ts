import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userSelectObjectSchema as userSelectObjectSchema } from './objects/userSelect.schema';
import { userIncludeObjectSchema as userIncludeObjectSchema } from './objects/userInclude.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './objects/userWhereUniqueInput.schema';

export const userFindUniqueSchema: z.ZodType<Prisma.userFindUniqueArgs> = z.object({ select: userSelectObjectSchema.optional(), include: userIncludeObjectSchema.optional(), where: userWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.userFindUniqueArgs>;

export const userFindUniqueZodSchema = z.object({ select: userSelectObjectSchema.optional(), include: userIncludeObjectSchema.optional(), where: userWhereUniqueInputObjectSchema }).strict();