import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionSelectObjectSchema as sessionSelectObjectSchema } from './objects/sessionSelect.schema';
import { sessionIncludeObjectSchema as sessionIncludeObjectSchema } from './objects/sessionInclude.schema';
import { sessionCreateInputObjectSchema as sessionCreateInputObjectSchema } from './objects/sessionCreateInput.schema';
import { sessionUncheckedCreateInputObjectSchema as sessionUncheckedCreateInputObjectSchema } from './objects/sessionUncheckedCreateInput.schema';

export const sessionCreateOneSchema: z.ZodType<Prisma.sessionCreateArgs> = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), data: z.union([sessionCreateInputObjectSchema, sessionUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.sessionCreateArgs>;

export const sessionCreateOneZodSchema = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), data: z.union([sessionCreateInputObjectSchema, sessionUncheckedCreateInputObjectSchema]) }).strict();