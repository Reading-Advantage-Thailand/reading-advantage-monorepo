import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionSelectObjectSchema as sessionSelectObjectSchema } from './objects/sessionSelect.schema';
import { sessionIncludeObjectSchema as sessionIncludeObjectSchema } from './objects/sessionInclude.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './objects/sessionWhereUniqueInput.schema';
import { sessionCreateInputObjectSchema as sessionCreateInputObjectSchema } from './objects/sessionCreateInput.schema';
import { sessionUncheckedCreateInputObjectSchema as sessionUncheckedCreateInputObjectSchema } from './objects/sessionUncheckedCreateInput.schema';
import { sessionUpdateInputObjectSchema as sessionUpdateInputObjectSchema } from './objects/sessionUpdateInput.schema';
import { sessionUncheckedUpdateInputObjectSchema as sessionUncheckedUpdateInputObjectSchema } from './objects/sessionUncheckedUpdateInput.schema';

export const sessionUpsertOneSchema: z.ZodType<Prisma.sessionUpsertArgs> = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), where: sessionWhereUniqueInputObjectSchema, create: z.union([ sessionCreateInputObjectSchema, sessionUncheckedCreateInputObjectSchema ]), update: z.union([ sessionUpdateInputObjectSchema, sessionUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.sessionUpsertArgs>;

export const sessionUpsertOneZodSchema = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), where: sessionWhereUniqueInputObjectSchema, create: z.union([ sessionCreateInputObjectSchema, sessionUncheckedCreateInputObjectSchema ]), update: z.union([ sessionUpdateInputObjectSchema, sessionUncheckedUpdateInputObjectSchema ]) }).strict();