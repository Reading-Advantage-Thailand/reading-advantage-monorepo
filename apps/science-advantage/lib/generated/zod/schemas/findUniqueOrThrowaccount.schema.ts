import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { accountSelectObjectSchema as accountSelectObjectSchema } from './objects/accountSelect.schema';
import { accountIncludeObjectSchema as accountIncludeObjectSchema } from './objects/accountInclude.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './objects/accountWhereUniqueInput.schema';

export const accountFindUniqueOrThrowSchema: z.ZodType<Prisma.accountFindUniqueOrThrowArgs> = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), where: accountWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.accountFindUniqueOrThrowArgs>;

export const accountFindUniqueOrThrowZodSchema = z.object({ select: accountSelectObjectSchema.optional(), include: accountIncludeObjectSchema.optional(), where: accountWhereUniqueInputObjectSchema }).strict();