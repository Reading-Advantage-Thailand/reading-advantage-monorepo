import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionSelectObjectSchema as sessionSelectObjectSchema } from './objects/sessionSelect.schema';
import { sessionIncludeObjectSchema as sessionIncludeObjectSchema } from './objects/sessionInclude.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './objects/sessionWhereUniqueInput.schema';

export const sessionDeleteOneSchema: z.ZodType<Prisma.sessionDeleteArgs> = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), where: sessionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.sessionDeleteArgs>;

export const sessionDeleteOneZodSchema = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), where: sessionWhereUniqueInputObjectSchema }).strict();