import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionSelectObjectSchema as sessionSelectObjectSchema } from './objects/sessionSelect.schema';
import { sessionIncludeObjectSchema as sessionIncludeObjectSchema } from './objects/sessionInclude.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './objects/sessionWhereUniqueInput.schema';

export const sessionFindUniqueSchema: z.ZodType<Prisma.sessionFindUniqueArgs> = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), where: sessionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.sessionFindUniqueArgs>;

export const sessionFindUniqueZodSchema = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), where: sessionWhereUniqueInputObjectSchema }).strict();